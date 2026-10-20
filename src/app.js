
const $=id=>document.getElementById(id),clone=o=>JSON.parse(JSON.stringify(o));
const sample={en:{headline:"GO BEYOND\nTHE ORDINARY.",body:"Every journey deserves a different perspective.",cta:"Discover more",price:"€399"},de:{headline:"MEHR ALS\nNUR EIN ABENTEUER.",body:"Jede Reise verdient eine neue Perspektive.",cta:"Jetzt entdecken",price:"€399"},fr:{headline:"CHANGEZ\nDE PERSPECTIVE.",body:"Chaque aventure mérite un nouveau regard.",cta:"Découvrir",price:"399 €"}};
function fresh(){return {version:1,kit:{name:"APEX Campaign",color:"#DFFF00",safe:.055,minFont:42,maxFont:92,maxLines:3,revision:1},copies:clone(sample),assets:{},local:{},templates:{},logs:[],allSizes:false,format:"feed",benchmark:{baseline:"",assisted:""}};}
let state=fresh(),docs=[],lastKit=null,selected="",reviews={},dirty=false,toastTimer;
function toast(text){$("toast").textContent=text;$("toast").style.display="block";clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").style.display="none",4500);}
const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");
function measure(text,size){ctx.font="700 "+size+"px Arial, sans-serif";return ctx.measureText(text).width;}
const E=createEngine(measure);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]));
function bounded(v,min,max,label){const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Error(label+"应在 "+min+"–"+max+" 之间");return n;}
function validate(raw){
  if(!raw||raw.version!==1)throw Error("仅支持 Brandloom v1 项目 JSON");
  const out=fresh(),k=raw.kit;if(!k||!/^#[0-9a-f]{6}$/i.test(k.color))throw Error("品牌色格式错误");
  out.kit={name:String(k.name||"Untitled").slice(0,60),color:k.color,safe:bounded(k.safe,.03,.12,"边距"),minFont:bounded(k.minFont,24,140,"最小字号"),maxFont:bounded(k.maxFont,24,140,"最大字号"),maxLines:bounded(k.maxLines,1,6,"行数"),revision:Math.max(1,Math.floor(Number(k.revision)||1))};
  if(!Number.isInteger(out.kit.maxLines)||out.kit.minFont>out.kit.maxFont)throw Error("请检查行数和字号范围");
  for(const lang of ["en","de","fr"]){const c=raw.copies?.[lang];if(!c)throw Error("缺少 "+lang+" 文案");out.copies[lang]={};for(const key of ["headline","body","cta","price"]){if(typeof c[key]!=="string"||c[key].length>3000)throw Error("文案字段无效");out.copies[lang][key]=c[key];}if(!c.headline.trim()||!c.cta.trim())throw Error("标题和 CTA 不能为空");}
  for(const id of ["logo","product"]){const a=raw.assets?.[id];if(a){if(typeof a.src!=="string"||a.src.length>6000000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(a.src))throw Error("素材格式无效");out.assets[id]={src:a.src,ratio:bounded(a.ratio,.01,100,"素材比例"),name:String(a.name||id).slice(0,120)};}}
  function cleanOverride(o){if(!o||typeof o!=="object")return {};const r={};for(const key of ["dx","dy"])if(o[key]!==undefined)r[key]=bounded(o[key],-600,600,"位移");if(o.font!==undefined)r.font=bounded(o.font,24,140,"标题字号");return r;}
  for(const f of Object.keys(E.formats)){out.templates[f]=cleanOverride(raw.templates?.[f]);for(const l of ["en","de","fr"])out.local[l+"_"+f]=cleanOverride(raw.local?.[l+"_"+f]);}
  out.format=E.formats[raw.format]?raw.format:"feed";out.allSizes=!!raw.allSizes;
  out.logs=Array.isArray(raw.logs)?raw.logs.slice(-80).map(l=>({time:String(l.time||"").slice(0,40),action:String(l.action||"").slice(0,100),detail:String(l.detail||"").slice(0,600)})):[];
  for(const key of ["baseline","assisted"]){const n=raw.benchmark?.[key];out.benchmark[key]=n!==""&&Number.isFinite(Number(n))&&Number(n)>=0&&Number(n)<100000?String(n):"";}
  return out;
}
let persistenceFailed=false;
function persist(){try{localStorage.setItem("brandloom-v1",JSON.stringify(state));persistenceFailed=false;}catch(e){if(!persistenceFailed){toast("浏览器无法保存项目，请使用「导出项目」备份。");persistenceFailed=true;}}}
try{const embedded=$("saved-project");const saved=embedded?embedded.textContent:localStorage.getItem("brandloom-v1");if(saved)state=validate(JSON.parse(saved));}catch(e){toast("未读取旧存档，已加载演示项目。");}
function log(action,detail){state.logs.push({time:new Date().toISOString(),action,detail:String(detail)});state.logs=state.logs.slice(-80);}
function loadCopy(){const c=state.copies[$("language").value];for(const key of ["headline","body","cta","price"])$(key).value=c[key];}
function syncInputs(){for(const key of ["minFont","maxFont","maxLines"])$(key).value=state.kit[key];$("brand").value=state.kit.name;$("color").value=state.kit.color;$("hex").textContent=state.kit.color.toUpperCase();$("safe").value=Number((state.kit.safe*100).toFixed(2));$("format").value=state.format;$("allSizes").checked=state.allSizes;for(const key of ["logo","product"])$(key+"Name").textContent=state.assets[key]?.name||"当前：APEX 演示素材";for(const key of ["baseline","assisted"])$(key).value=state.benchmark[key];loadCopy();updateBenchmark();}
function collect(){
  for(const key of ["headline","body","cta","price"])state.copies[$("language").value][key]=$(key).value;
  const k={...state.kit,name:$("brand").value,color:$("color").value,safe:Number($("safe").value)/100,minFont:Number($("minFont").value),maxFont:Number($("maxFont").value),maxLines:Number($("maxLines").value)};
  if(["name","color","safe","minFont","maxFont","maxLines"].some(key=>k[key]!==state.kit[key]))k.revision=state.kit.revision+1;
  state=validate({...state,kit:k,allSizes:$("allSizes").checked,format:$("format").value});$("hex").textContent=state.kit.color.toUpperCase();
}
function markDirty(){dirty=true;$("runState").textContent="输入已修改 · 请重新生成";}
function current(){return docs.find(d=>d.id===selected)||docs[0];}
function checks(d){return E.check(d,lastKit).map(r=>r.status==="review"&&reviews[d.id]?{...r,status:"pass",detail:"设计师已手动确认本次输出；重新生成后需要再次确认。"}:r);}
function summary(d){const rs=checks(d);return rs.some(r=>r.status==="fail")?{class:"fail",text:"需要修复"}:rs.some(r=>r.status==="review")?{class:"review",text:"待视觉复核"}:{class:"pass",text:"审核通过"};}
function svg(d,guides=false){
  const color=esc(d.kitColor),id=d.id.replace(/[^a-z0-9_]/gi,""),s=d.s;
  const content=d.nodes.map(n=>{
    if(n.kind==="text")return '<text font-family="Arial, sans-serif" font-weight="700" font-size="'+n.size+'" fill="'+esc(n.color)+'">'+n.lines.map((line,i)=>'<tspan x="'+n.x+'" y="'+(n.y+n.size*.86+i*n.size*1.15)+'">'+esc(line)+'</tspan>').join("")+'</text>';
    if(n.src)return '<image href="'+esc(n.src)+'" x="'+n.x+'" y="'+n.y+'" width="'+n.w+'" height="'+n.h+'" preserveAspectRatio="none"/>';
    if(n.kind==="logo")return '<svg x="'+n.x+'" y="'+n.y+'" width="'+n.w+'" height="'+n.h+'" viewBox="0 0 130 42"><text x="0" y="33" fill="white" font-family="Arial, sans-serif" font-weight="900" font-size="35" letter-spacing="2">APEX</text><circle cx="119" cy="8" r="4" fill="'+color+'"/></svg>';
    return '<svg x="'+n.x+'" y="'+n.y+'" width="'+n.w+'" height="'+n.h+'" viewBox="0 0 240 320" preserveAspectRatio="none"><rect x="31" y="6" width="178" height="306" rx="33" fill="#111513" stroke="#777e76" stroke-width="3"/><rect x="43" y="18" width="154" height="278" rx="24" fill="url(#metal_'+id+')"/><rect x="53" y="32" width="134" height="155" rx="22" fill="#171d19" stroke="#5e685e" stroke-width="2"/><circle cx="120" cy="109" r="56" fill="#060a09" stroke="#697a6a" stroke-width="5"/><circle cx="120" cy="109" r="41" fill="#152c29" stroke="#2f4140" stroke-width="5"/><circle cx="120" cy="109" r="26" fill="#0a1012"/><ellipse cx="107" cy="94" rx="10" ry="7" fill="#7895a0" opacity=".55"/><circle cx="120" cy="229" r="18" fill="'+color+'"/><text x="120" y="272" text-anchor="middle" font-family="Arial" font-size="12" letter-spacing="4" fill="#aeb8ab">APEX</text><path d="M64 298h112" stroke="#080d0b" stroke-width="6"/></svg>';
  }).join("");
  const debug=guides?'<rect x="'+d.margin+'" y="'+d.margin+'" width="'+(d.w-2*d.margin)+'" height="'+(d.h-2*d.margin)+'" fill="none" stroke="white" stroke-opacity=".65" stroke-width="'+2*s+'" stroke-dasharray="'+10*s+' '+8*s+'"/>':"";
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+d.w+'" height="'+d.h+'" viewBox="0 0 '+d.w+' '+d.h+'" role="img" aria-label="'+esc(lastKit.name+" "+d.locale+" "+d.format)+'"><title>'+esc(lastKit.name+" · "+d.locale+" · "+d.format)+'</title><defs><linearGradient id="metal_'+id+'" x2="1" y2=".5"><stop stop-color="#657166"/><stop offset=".35" stop-color="#333d35"/><stop offset="1" stop-color="#151d18"/></linearGradient><pattern id="grid_'+id+'" width="'+80*s+'" height="'+80*s+'" patternUnits="userSpaceOnUse"><path d="M '+80*s+' 0 L 0 0 0 '+80*s+'" fill="none" stroke="#fff" stroke-opacity=".035" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="#151b17"/><path d="M '+d.w*.8+' 0 H '+d.w+' V '+d.h*.82+' L '+d.w*.32+' '+d.h+' Z" fill="'+color+'" opacity=".08"/><rect width="100%" height="100%" fill="url(#grid_'+id+')"/><circle cx="'+d.w*.8+'" cy="'+d.h*.55+'" r="'+Math.min(d.w,d.h)*.33+'" fill="none" stroke="'+color+'" stroke-opacity=".15" stroke-width="'+2*s+'"/><rect x="'+d.button.x+'" y="'+d.button.y+'" width="'+d.button.w+'" height="'+d.button.h+'" rx="'+5*s+'" fill="'+color+'"/>'+content+debug+'</svg>';
}
function renderLogs(){$("logs").replaceChildren();if(!state.logs.length){$("logs").textContent="尚无修改记录。";return;}for(const l of state.logs.slice(-8).reverse()){const item=document.createElement("div");item.className="log";const title=document.createElement("strong");title.textContent=l.action;const detail=document.createElement("div");detail.textContent=l.detail;const time=document.createElement("div");time.className="hint";time.textContent=new Date(l.time).toLocaleString();item.append(title,detail,time);$("logs").append(item);}}
function render(){
  const d=current();if(!d)return;selected=d.id;
  $("total").textContent=docs.length;$("failures").textContent=docs.filter(d=>summary(d).class==="fail").length;$("pending").textContent=docs.filter(d=>checks(d).some(r=>r.status==="review")).length;
  $("cards").innerHTML=docs.map(x=>{const st=summary(x);return '<button class="card '+(x.id===selected?"active":"")+'" data-id="'+x.id+'" aria-label="'+x.locale+" "+E.formats[x.format].name+'"><div class="thumb">'+svg(x,false)+'</div><div class="cardfoot"><b>'+x.locale.toUpperCase()+" · "+(x.format==="feed"?"4:5":x.format==="story"?"9:16":"16:9")+'</b><span class="status '+st.class+'">'+st.text+'</span></div></button>';}).join("");
  $("stage").innerHTML=svg(d,$("guides").checked);$("selectionTitle").textContent=d.locale.toUpperCase()+" / "+E.formats[d.format].name;
  $("checks").replaceChildren();for(const r of checks(d)){const line=document.createElement("div");line.className="check";const status=document.createElement("span");status.className="status "+r.status;status.textContent={pass:"通过",fail:"不通过",review:"待审核"}[r.status];const title=document.createElement("b");title.textContent=r.label;const desc=document.createElement("p");desc.textContent=r.detail;line.append(status,title,desc);$("checks").append(line);}
  const ov=d.override||{};$("dx").value=ov.dx??0;$("dy").value=ov.dy??0;$("fontOverride").value=ov.font??"";
  $("approve").textContent=reviews[d.id]?"撤销当前版视觉确认":"确认当前版视觉审核通过";renderLogs();
}
function generate(record=true){
  collect();lastKit=clone(state.kit);const fs=state.allSizes?Object.keys(E.formats):[state.format];docs=[];
  for(const locale of ["en","de","fr"])for(const f of fs)docs.push(E.build(lastKit,state.copies[locale],locale,f,state.assets,{...state.templates[f],...state.local[locale+"_"+f]}));
  reviews={};dirty=false;$("runState").textContent="已生成 · 品牌规则 v"+state.kit.revision;if(record)log("生成版本",docs.length+" 个输出；审核确认已重置。");render();persist();
}
function guard(){if(dirty){toast("输入已修改，请先重新生成，再检查或导出输出。");return false;}return !!current();}
function download(name,data,type){const blob=new Blob([data],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function report(){return {tool:"Brandloom",version:1,createdAt:new Date().toISOString(),mode:"deterministic-layout",font:"Arial 700",brand:clone(lastKit),assets:Object.fromEntries(Object.entries(state.assets).map(([k,v])=>[k,{name:v.name,ratio:v.ratio}])),benchmark:state.benchmark,outputs:docs.map(d=>({id:d.id,width:d.w,height:d.h,expected:d.expected,override:d.override,status:summary(d).text,checks:checks(d)})),logs:state.logs,limitations:["文本按字体宽度和行框检查，实际显示需人工复核。","只检查标题和 CTA 背景的品牌色属性，不检查位图颜色。","边界重叠只提供人工审核线索，不代表真实像素遮挡。","视觉审核是设计师的明确确认，不是系统的自动判断。"]};}
function updateBenchmark(){const a=Number($("baseline").value),b=Number($("assisted").value);state.benchmark={baseline:$("baseline").value,assisted:$("assisted").value};$("benchmark").textContent=a>0&&$("assisted").value!==""&&b>=0?"实际记录：人工 "+a+" 分钟，辅助后 "+b+" 分钟；"+(b<=a?"减少 "+((a-b)/a*100).toFixed(1)+"%。":"增加 "+((b-a)/a*100).toFixed(1)+"%。"):"尚未填写完整对照数据。";}
function handle(fn){return async event=>{try{await fn(event);}catch(e){toast(e.message||"操作失败");}};}
$("generate").onclick=handle(()=>generate());
$("language").onchange=()=>loadCopy();
for(const id of ["headline","body","cta","price"])$(id).addEventListener("input",()=>{state.copies[$("language").value][id]=$(id).value;markDirty();});
for(const id of ["brand","color","safe","minFont","maxFont","maxLines","format","allSizes"])$(id).addEventListener("input",()=>{if(id==="color")$("hex").textContent=$("color").value.toUpperCase();markDirty();});
for(const id of ["baseline","assisted"])$(id).addEventListener("input",()=>{updateBenchmark();persist();});
$("cards").onclick=e=>{const b=e.target.closest("button[data-id]");if(b){selected=b.dataset.id;render();}};
$("guides").onchange=()=>render();
for(const id of ["logo","product"])$(id+"File").onchange=handle(async()=>{
  const file=$(id+"File").files[0];if(!file)return;if(file.size>4*1024*1024||!["image/png","image/jpeg","image/webp"].includes(file.type))throw Error("请使用 4MB 内的 PNG、JPG 或 WebP。");
  const src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error("读取图片失败"));r.readAsDataURL(file);});
  const image=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error("图片无法解码"));im.src=src;});
  const ratio=image.naturalWidth/image.naturalHeight;if(ratio<.01||ratio>100)throw Error("图片宽高比超出支持范围");
  state.assets[id]={src,ratio,name:file.name};$(id+"Name").textContent=file.name;markDirty();toast("已读取素材，重新生成后生效。");
});
$("clearAssets").onclick=()=>{state.assets={};for(const id of ["logo","product"]){$(id+"Name").textContent="当前：APEX 演示素材";$(id+"File").value="";}markDirty();};
$("approve").onclick=handle(()=>{if(!guard())return;const d=current();if(checks(d).some(r=>r.status==="fail"))throw Error("当前版还有硬性检查失败，请先修复。");reviews[d.id]=!reviews[d.id];log(reviews[d.id]?"人工视觉确认":"撤销视觉确认",d.id);render();persist();});
$("apply").onclick=handle(()=>{
  if(!guard())return;const d=current(),scope=$("scope").value,reason=$("reason").value.trim();if(!reason)throw Error("请填写修改原因。");
  const ov={dx:bounded($("dx").value,-600,600,"水平位移"),dy:bounded($("dy").value,-600,600,"垂直位移")};if($("fontOverride").value!=="")ov.font=bounded($("fontOverride").value,24,140,"标题字号");
  if(scope==="brand"&&(ov.font===undefined||ov.font<state.kit.minFont))throw Error("品牌级需填写不小于最小字号的标题字号上限。");
  const before=clone(d.override);
  if(scope==="template"){state.templates[d.format]=ov;delete state.local[d.id];}
  else {state.local[d.id]=ov;if(scope==="brand"){state.kit.maxFont=ov.font;state.kit.revision++;$("maxFont").value=ov.font;}}
  log("保存修正 · "+{once:"当前版本",template:"尺寸模板",brand:"品牌字号上限"}[scope],d.id+" | "+reason+" | "+JSON.stringify(before)+" → "+JSON.stringify(ov));
  generate(false);toast("修正已复用到新输出；请重新审核。");
});
$("inject").onclick=handle(()=>{
  if(!guard())return;const d=current(),kind=$("fault").value;const n=id=>d.nodes.find(x=>x.id===id);
  if(kind==="ratio")n("product").w*=1.3;if(kind==="color")n("headline").color="#FF44AA";if(kind==="bounds")n("logo").x=-20;if(kind==="price"){n("price").text="CHANGED";n("price").lines=["CHANGED"];}
  delete reviews[d.id];log("注入验证故障",d.id+" · "+kind);render();persist();
});
$("svgExport").onclick=handle(()=>{if(guard())download(current().id+".svg",svg(current(),false),"image/svg+xml;charset=utf-8");});
$("pngExport").onclick=handle(async()=>{
  if(!guard())return;const d=current(),source=svg(d,false),u=URL.createObjectURL(new Blob([source],{type:"image/svg+xml"}));
  try{const image=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error("SVG 渲染失败，请先尝试导出 SVG。"));i.src=u;});const c=document.createElement("canvas");c.width=d.w;c.height=d.h;c.getContext("2d").drawImage(image,0,0);const blob=await new Promise(resolve=>c.toBlob(resolve,"image/png"));if(!blob)throw Error("PNG 导出失败");download(d.id+".png",blob,"image/png");}finally{URL.revokeObjectURL(u);}
});
$("reportExport").onclick=handle(()=>{if(guard())download("brandloom-report.json",JSON.stringify(report(),null,2),"application/json");});
$("projectExport").onclick=handle(()=>{collect();download("brandloom-project.json",JSON.stringify(state,null,2),"application/json");persist();});
$("projectImport").onclick=()=>$("importFile").click();
$("importFile").onchange=handle(async()=>{
  const f=$("importFile").files[0];if(!f)return;if(f.size>14000000)throw Error("项目文件不能超过 14MB");
  const candidate=validate(JSON.parse(await f.text()));if(!confirm("导入将替换当前项目。请确认已导出需要保留的项目。"))return;
  state=candidate;selected="";syncInputs();generate(false);toast("项目已导入。");$("importFile").value="";
});
$("rulesExport").onclick=handle(()=>{collect();const k=state.kit;download("DESIGN.md",["# "+k.name,"","规则版本："+k.revision,"","## 可执行规则","- 强调色："+k.color+"；用于标题和 CTA 背景。","- 安全边距：画布短边的 "+(k.safe*100).toFixed(1)+"%。","- 标题字号："+k.minFont+"–"+k.maxFont+"px（1080px 短边基准）。","- 标题最多 "+k.maxLines+" 行。","- 固定字体：Arial，700。","- Logo 与产品保持原始宽高比。","- 文案不改写；价格逐字保留。","- 先换行，再缩小字号；仍放不下时报告失败。","","## 人工判断","- 产品可见性、构图、品牌感、字体显示、阅读体验。","","## 规则适用范围","- 本原型自定义营销规则，不声明兼容第三方 DESIGN.md 标准。","- 仅本次修正与尺寸模板偏好分别保存在项目 JSON 的 local 与 templates 中。",""].join("\n"),"text/markdown;charset=utf-8");});
$("htmlExport").onclick=handle(()=>{
  collect();const doc=document.documentElement.cloneNode(true);doc.querySelector("#saved-project")?.remove();
  const embedded=document.createElement("script");embedded.id="saved-project";embedded.type="application/json";embedded.textContent=JSON.stringify(state).replace(/</g,"\\u003c");doc.querySelector("head").append(embedded);
  const toastNode=doc.querySelector("#toast");if(toastNode)toastNode.style.display="none";
  download("brandloom.html","<!doctype html>\n"+doc.outerHTML,"text/html;charset=utf-8");persist();toast("已下载离线 HTML，其中包含当前项目与素材。");
});
$("selfTest").onclick=handle(()=>{
  const k=fresh().kit,c=sample.en,b=E.build(k,c,"en","feed",{}),results=[];
  const test=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(e){results.push({name,pass:false});}};
  test("默认三种尺寸硬性检查",()=>Object.keys(E.formats).every(f=>E.check(E.build(k,c,"en",f,{}),k).every(r=>r.status!=="fail")));
  for(const [name,rule,mutate] of [
    ["识别产品拉伸","product.ratio",d=>d.nodes.find(n=>n.id==="product").w*=1.3],
    ["识别指定元素错色","brand.color",d=>d.nodes.find(n=>n.id==="headline").color="#FF00FF"],
    ["识别元素越界","layout.safe",d=>d.nodes.find(n=>n.id==="logo").x=-20],
    ["识别价格篡改","copy.exact",d=>d.nodes.find(n=>n.id==="price").lines=["WRONG"]]
  ])test(name,()=>{const d=clone(b);mutate(d);return E.check(d,k).find(r=>r.id===rule).status==="fail";});
  test("超长标题保留原文且报错",()=>{const title=("A VERY LONG HEADLINE ").repeat(40),d=E.build(k,{...c,headline:title},"en","feed",{});return d.nodes.find(n=>n.id==="headline").text===title&&E.check(d,k).find(r=>r.id==="type.limits").status==="fail";});
  test("再次生成保留修正参数",()=>{const d=E.build(k,c,"en","feed",{},{dx:31,font:68});return d.nodes.find(n=>n.id==="headline").x===b.nodes.find(n=>n.id==="headline").x+31&&d.nodes.find(n=>n.id==="headline").size===68;});
  $("testResults").textContent=results.map(r=>(r.pass?"✓ ":"✕ ")+r.name).join(" / ");log("运行内置自测",results.filter(r=>r.pass).length+"/"+results.length+" 通过");renderLogs();persist();
});
$("help").onclick=()=>alert("Brandloom · 本地品牌适配实验\n\n1. 使用演示项目，或填写品牌规则、上传素材。\n2. 分别选择 EN / DE / FR 填写已确认的文案。\n3. 选择一个尺寸生成三个版本，或勾选全部尺寸生成九个版本。\n4. 点击输出查看检查结果；可调整标题位移、字号，选择修正范围并保存。\n5. 硬性检查通过后，逐版进行人工视觉审核。\n6. 导出 SVG、PNG、完整检查报告，或下载包含当前项目的离线 HTML。\n\n重要边界：\n当前没有 AI 模型、自动翻译、PDF / 官网规则提取或任意 SVG 模板导入。使用内置分层模板与固定 Arial 字体。Logo、产品素材不会被重新生成。位图内容、产品真实性、遮挡与品牌感需要人工确认。\n\n只在浏览器本地处理文件；本页没有联网请求。建议定期导出项目备份。下载的 HTML / JSON 包含你的素材，按原素材的权限使用和分享。");
syncInputs();try{generate(false);}catch(e){toast("初始化失败："+e.message);}
