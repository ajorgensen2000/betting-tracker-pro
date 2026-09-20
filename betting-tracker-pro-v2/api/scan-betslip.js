const ALLOWED_LEAGUES=["Premier League","La Liga","Serie A","Bundesliga","Ligue 1","Superliga","Champions League","Europa League","Conference League","Championship","Eredivisie","Primeira Liga","MLS","International","Flere ligaer","Other"];
const ALLOWED_CATEGORIES=["Resultat","Mål","BTTS","Handicap","Hjørnespark","Kort","Frispark","Skud","Skud på mål","Spiller","Tacklinger","Kombinationsspil","Andet"];
const ALLOWED_MARKETS=["Home Win","Draw","Away Win","Double Chance 1X","Double Chance X2","Double Chance 12","Draw No Bet","Favourite Wins","Over 0.5 Goals","Over 1.5 Goals","Over 2.5 Goals","Over 3.5 Goals","Under 0.5 Goals","Under 1.5 Goals","Under 2.5 Goals","Under 3.5 Goals","BTTS Yes","BTTS No","Asian Handicap","European Handicap","Team Goals Over","Team Goals Under","Corners Over","Corners Under","Most Corners","Team Corners Over","Team Corners Under","Cards Over","Cards Under","Most Cards","Team Cards Over","Team Cards Under","Fouls Over","Fouls Under","Most Fouls","Shots Over","Shots Under","Most Shots","Shots on Target Over","Shots on Target Under","Most Shots on Target","Player to Score","Player Shots","Player Shots on Target","Player Assist","Player Tackles","Bet Builder","Other"];
const ALLOWED_PERIODS=["Fuldtid","1. halvleg","2. halvleg","Kamp"];

function extractText(data){
  for(const item of data?.output||[]){
    for(const content of item?.content||[]){
      if(content?.type==="output_text"&&typeof content.text==="string")return content.text;
    }
  }
  return "";
}

module.exports=async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST")return res.status(405).json({error:"Kun POST er tilladt."});
  if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:"AI-scanner er ikke aktiveret endnu.",code:"AI_NOT_CONFIGURED"});
  let body=req.body;
  if(typeof body==="string"){try{body=JSON.parse(body)}catch{return res.status(400).json({error:"Ugyldig JSON."})}}
  const images=Array.isArray(body?.images)?body.images.filter(x=>typeof x==="string"&&x.startsWith("data:image/")):[];
  if(!images.length)return res.status(400).json({error:"Der mangler et billede."});
  if(images.length>4)return res.status(400).json({error:"Maksimalt 4 screenshots pr. scan."});

  const prompt=`Du analyserer screenshots af danske sports-betslips, især Danske Spil "Byg væddemål". Flere billeder kan være overlappende screenshots af DET SAMME bet.\n\nOpgave:\n1. Find liga, kamp og SAMLET odds for hele kuponen. Ignorér saldo, tidspunkt, gevinstboost, session, navigation og beløbsfelter.\n2. Find hvert faktisk valg/ben. Grøn/fremhævet tekst er ofte selve valget; grå tekst under er ofte markedsbeskrivelse. Brug begge til at forstå benet.\n3. Dedupliker ben, som går igen på overlappende screenshots. Bevar rækkefølgen fra betslippet.\n4. Skeln nøje mellem skud og skud på mål, hold og spiller, 1. halvleg og fuldtid, over/under, flest, resultat og linjetal. Decimal-komma 1,5 betyder 1.5. Tekst som "1+" betyder linje 1.\n5. Gæt ikke et hold/spiller-navn, hvis det ikke kan læses. Sæt subject til tom streng og lav en warning.\n6. Hvis samlet odds ikke kan identificeres sikkert, sæt odds til null. Individuelle linjetal må IKKE forveksles med samlet odds.\n7. Hvis der er 2 eller flere ben, betType skal være "Byg væddemål". Ellers "Single".\n\nVælg category, market og period KUN fra de tilladte værdier i schemaet. For holdspecifikke markeder: brug fx Team Goals Over/Under og Team Corners Over/Under. For spiller-markeder: brug Player Shots, Player Shots on Target, Player Tackles osv. Selection skal være kort og menneskeligt, fx "Under", "Over", "1+", "Flest skud", "AC Milan vinder".\n\nraw_text skal være en kort, læsbar transskription af de relevante betslip-linjer (ikke hele appens navigation). confidence er 0-1 for hvert ben og overall_confidence er 0-1 for hele scanningen.`;

  const schema={
    type:"object",additionalProperties:false,
    properties:{
      betType:{type:"string",enum:["Single","Byg væddemål"]},
      league:{type:"string",enum:ALLOWED_LEAGUES},
      match:{type:"string"},
      odds:{type:["number","null"]},
      overall_confidence:{type:"number",minimum:0,maximum:1},
      raw_text:{type:"string"},
      warnings:{type:"array",items:{type:"string"}},
      legs:{type:"array",items:{type:"object",additionalProperties:false,properties:{
        category:{type:"string",enum:ALLOWED_CATEGORIES},
        market:{type:"string",enum:ALLOWED_MARKETS},
        subject:{type:"string"},
        selection:{type:"string"},
        line:{type:["number","null"]},
        period:{type:"string",enum:ALLOWED_PERIODS},
        confidence:{type:"number",minimum:0,maximum:1},
        warning:{type:"string"}
      },required:["category","market","subject","selection","line","period","confidence","warning"]}}
    },
    required:["betType","league","match","odds","overall_confidence","raw_text","warnings","legs"]
  };

  try{
    const apiRes=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{"Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        model:process.env.OPENAI_VISION_MODEL||"gpt-5.6-terra",
        store:false,
        max_output_tokens:2600,
        input:[{role:"user",content:[{type:"input_text",text:prompt},...images.map(image_url=>({type:"input_image",image_url,detail:"high"}))]}],
        text:{format:{type:"json_schema",name:"betslip_scan",strict:true,schema}}
      })
    });
    const data=await apiRes.json();
    if(!apiRes.ok){console.error("OpenAI error",data);return res.status(502).json({error:data?.error?.message||"AI-scanneren kunne ikke analysere billedet.",code:"AI_UPSTREAM_ERROR"})}
    const text=extractText(data);
    if(!text)return res.status(502).json({error:"AI-scanneren returnerede intet resultat.",code:"AI_EMPTY"});
    let parsed;try{parsed=JSON.parse(text)}catch{console.error("Invalid structured output",text);return res.status(502).json({error:"AI-resultatet kunne ikke læses.",code:"AI_BAD_JSON"})}
    return res.status(200).json(parsed);
  }catch(err){console.error(err);return res.status(500).json({error:"AI-scanneren fejlede. Prøv igen.",code:"AI_SERVER_ERROR"})}
}
