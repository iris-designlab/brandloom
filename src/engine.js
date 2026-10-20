function createEngine(measure){
  const formats={feed:{name:"Feed · 4:5",w:1080,h:1350},story:{name:"Story · 9:16",w:1080,h:1920},wide:{name:"Banner · 16:9",w:1920,h:1080}};
  const normal=s=>String(s).replace(/\s/g,"");
  function wrap(text,size,width){
    const lines=[];
    for(const paragraph of String(text).split("\n")){
      let line="";
      for(const word of paragraph.split(/\s+/).filter(Boolean)){
        if(measure(word,size)>width){
          if(line){lines.push(line);line="";}
          for(const char of Array.from(word)){
            if(line&&measure(line+char,size)>width){lines.push(line);line="";}
            line+=char;
          }
        } else if(line&&measure(line+" "+word,size)>width){lines.push(line);line=word;}
        else line+=(line?" ":"")+word;
      }
      if(line||!paragraph)lines.push(line);
    }
    return lines.length?lines:[""];
  }
  function textNode(id,text,x,y,size,width,color,maxLines){
    const lines=wrap(text,size,width);
    return {id,kind:"text",text,lines,x,y,size,w:Math.max(...lines.map(t=>measure(t,size))),h:lines.length*size*1.15,color,maxLines};
  }
  function build(kit,copy,locale,format,assets,override={}){
    const f=formats[format],{w,h}=f,s=Math.min(w,h)/1080,m=Math.min(w,h)*kit.safe,wide=format==="wide",nodes=[];
    const logo=assets.logo;
    const logoH=logo?Math.min(42*s,w*.28/logo.ratio):42*s,logoW=logo?logoH*logo.ratio:130*s;
    nodes.push({id:"logo",kind:logo?"image":"logo",x:m,y:m,w:logoW,h:logoH,ratio:logo?logo.ratio:130/42,src:logo?.src});
    let font=(override.font??kit.maxFont)*s;
    const titleW=(wide?w*.44:w-2*m)*(override.width??1);
    if(override.font===undefined)while(font>kit.minFont*s&&wrap(copy.headline,font,titleW).length>kit.maxLines)font=Math.max(kit.minFont*s,font-2*s);
    const title=textNode("headline",copy.headline,m+(override.dx??0)*s,m+110*s+(override.dy??0)*s,font,titleW,kit.color,kit.maxLines);
    nodes.push(title);
    const ratio=assets.product?.ratio??.75,bw=wide?w*.36:w*.57,bh=wide?h*.68:h*.39;
    const pw=Math.min(bw,bh*ratio),ph=pw/ratio;
    nodes.push({id:"product",kind:"image",src:assets.product?.src,x:wide?w*.59:(w-pw)/2+w*.12,y:wide?h*.14:h*.39,w:pw,h:ph,ratio});
    const body=textNode("body",copy.body,m,wide?h*.65:h*.82,26*s,wide?w*.44:w-2*m,"#D4D4D4",3);
    nodes.push(body);
    let ctaSize=24*s,available=w-2*m-240*s;
    while(ctaSize>18*s&&measure(copy.cta,ctaSize)+48*s>available)ctaSize-=s;
    const cta=textNode("cta",copy.cta,m+24*s,h-m-67*s+18*s,ctaSize,Math.max(20,available-48*s),"#111111",1);
    const button={x:m,y:h-m-67*s,w:Math.min(available,measure(copy.cta,ctaSize)+48*s),h:67*s};
    nodes.push(cta);
    nodes.push(textNode("price",copy.price,w-m-measure(copy.price,32*s),button.y+13*s,32*s,w*.25,"#FFFFFF",1));
    return {id:locale+"_"+format,locale,format,w,h,s,margin:m,kitColor:kit.color,nodes,button,expected:{...copy},override:{...override}};
  }
  function check(doc,kit){
    const result=[],find=id=>doc.nodes.find(n=>n.id===id);
    const add=(id,ok,label,detail)=>result.push({id,status:ok?"pass":"fail",label,detail});
    const f=formats[doc.format],t=find("headline"),p=find("product"),l=find("logo");
    add("canvas.size",doc.w===f.w&&doc.h===f.h,"画布尺寸",doc.w+" × "+doc.h);
    add("copy.exact",["headline","body","cta"].every(id=>normal(find(id).lines.join(""))===normal(doc.expected[id]))&&find("price").text===doc.expected.price&&find("price").lines.join("")===doc.expected.price,"文案与价格","对照任务输入；排版换行与空白差异忽略，价格逐字比较");
    add("product.ratio",Math.abs(p.w/p.h/p.ratio-1)<.001,"产品保持比例","与上传素材或演示图的原始宽高比比较");
    add("logo.ratio",Math.abs(l.w/l.h/l.ratio-1)<.001,"Logo 保持比例","与原始宽高比比较");
    const outside=doc.nodes.filter(n=>n.x<doc.margin-.5||n.y<doc.margin-.5||n.x+n.w>doc.w-doc.margin+.5||n.y+n.h>doc.h-doc.margin+.5);
    add("layout.safe",outside.length===0,"元素安全区",outside.length?outside.map(n=>n.id).join("、")+" 超出安全区":"按对象与文本测量边界检查");
    add("type.limits",t.lines.length<=kit.maxLines&&t.size>=kit.minFont*doc.s-.1&&t.size<=kit.maxFont*doc.s+.1,"标题行数与字号",t.lines.length+" 行 · "+Math.round(t.size/doc.s)+"px（1080 基准）");
    add("brand.color",t.color.toUpperCase()===kit.color.toUpperCase()&&doc.kitColor.toUpperCase()===kit.color.toUpperCase(),"指定元素品牌色","只检查标题和 CTA 背景属性");
    const c=find("cta");
    add("copy.fit",c.lines.length===1&&c.x+c.w<=doc.button.x+doc.button.w-15*doc.s&&c.y+c.h<=doc.button.y+doc.button.h&&find("body").lines.length<=3,"正文与 CTA 容量","CTA 单行且位于按钮内；正文不超过 3 行");
    const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
    const pairs=[["headline","product"],["body","product"],["body","cta"],["headline","body"],["logo","headline"]];
    const hits=pairs.filter(([a,b])=>overlap(find(a),find(b))).map(x=>x.join(" / "));
    result.push({id:"visual.review",status:"review",label:"视觉与遮挡审核",detail:hits.length?"边界疑似重叠："+hits.join("、")+"；请结合透明区域人工判断":"请确认构图、产品可见性、字体显示和最终文案阅读体验"});
    return result;
  }
  return {formats,wrap,build,check};
}

if (typeof module !== "undefined" && module.exports) module.exports = { createEngine };
