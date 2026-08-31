const fs=require('fs');
const g=JSON.parse(fs.readFileSync('es_ccaa.geojson','utf8'));

const W=1000,H=700;
const merc=([lon,lat])=>[lon, Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))*180/Math.PI];

// Douglas-Peucker
function dp(pts,tol){
  if(pts.length<3) return pts;
  let dmax=0,idx=0;
  const [ax,ay]=pts[0],[bx,by]=pts[pts.length-1];
  const dx=bx-ax,dy=by-ay, len=Math.hypot(dx,dy);
  for(let i=1;i<pts.length-1;i++){
    const [px,py]=pts[i];
    const d = len===0 ? Math.hypot(px-ax,py-ay)
                      : Math.abs(dy*px - dx*py + bx*ay - by*ax)/len;
    if(d>dmax){dmax=d;idx=i;}
  }
  if(dmax>tol){
    const l=dp(pts.slice(0,idx+1),tol), r=dp(pts.slice(idx),tol);
    return l.slice(0,-1).concat(r);
  }
  return [pts[0],pts[pts.length-1]];
}

const CANARY=new Set(['Canarias']);
function rings(f){
  const gm=f.geometry, out=[];
  const push=poly=>poly.forEach((r,i)=>out.push({ring:r,hole:i>0}));
  if(gm.type==='Polygon') push(gm.coordinates);
  else gm.coordinates.forEach(push);
  return out;
}

// pass 1: project, find extents for mainland group and canary group
const feats=g.features.map(f=>({
  name:f.properties.name, code:f.properties.cod_ccaa,
  official:f.properties.noml_ccaa,
  rings:rings(f).map(r=>({hole:r.hole, pts:r.ring.map(merc)}))
}));

function extent(list){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  list.forEach(f=>f.rings.forEach(r=>r.pts.forEach(([x,y])=>{
    if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;
  })));
  return [x0,y0,x1,y1];
}
const main=feats.filter(f=>!CANARY.has(f.name));
const can=feats.filter(f=>CANARY.has(f.name));

const PAD=26;
const [mx0,my0,mx1,my1]=extent(main);
const sMain=Math.min((W-PAD*2)/(mx1-mx0),(H-PAD*2-70)/(my1-my0));
const offX=PAD+((W-PAD*2)-(mx1-mx0)*sMain)/2;
const offY=PAD+((H-PAD*2-70)-(my1-my0)*sMain)/2;
const projMain=([x,y])=>[offX+(x-mx0)*sMain, offY+(my1-y)*sMain];

// canary inset box bottom-left
const CB={x:24,y:H-138,w:236,h:112};
const [cx0,cy0,cx1,cy1]=extent(can);
const sCan=Math.min((CB.w-14)/(cx1-cx0),(CB.h-14)/(cy1-cy0));
const cOffX=CB.x+7+((CB.w-14)-(cx1-cx0)*sCan)/2;
const cOffY=CB.y+7+((CB.h-14)-(cy1-cy0)*sCan)/2;
const projCan=([x,y])=>[cOffX+(x-cx0)*sCan, cOffY+(cy1-y)*sCan];

const TOL=0.55, MINAREA=1.4;
function areaOf(pts){let a=0;for(let i=0,j=pts.length-1;i<pts.length;j=i++)a+=(pts[j][0]+pts[i][0])*(pts[j][1]-pts[i][1]);return Math.abs(a/2);}

const out=[];
for(const f of feats){
  const P = CANARY.has(f.name)?projCan:projMain;
  let d='', cxs=0,cys=0,cn=0, x0=1e9,y0=1e9,x1=-1e9,y1=-1e9, totalArea=0;
  for(const r of f.rings){
    let pts=r.pts.map(P);
    pts=dp(pts,TOL);
    const a=areaOf(pts);
    if(pts.length<4||a<MINAREA) continue;
    totalArea+=a;
    d+='M'+pts.map(([x,y],i)=>{
      const X=Math.round(x*10)/10, Y=Math.round(y*10)/10;
      if(i===0){cxs+=0;}
      if(X<x0)x0=X; if(X>x1)x1=X; if(Y<y0)y0=Y; if(Y>y1)y1=Y;
      return (i? 'L':'')+X+' '+Y;
    }).join('')+'Z';
    // area-weighted centroid contribution
    pts.forEach(([x,y])=>{cxs+=x*a;cys+=y*a;cn+=a;});
  }
  if(!d) continue;
  out.push({
    name:f.name, code:f.code, official:f.official,
    d, cx:Math.round((cxs/cn)*10)/10, cy:Math.round((cys/cn)*10)/10,
    bbox:[x0,y0,x1,y1].map(v=>Math.round(v*10)/10),
    inset:CANARY.has(f.name)
  });
}
out.sort((a,b)=>a.code.localeCompare(b.code));
fs.writeFileSync('map_paths.json',JSON.stringify({W,H,CB,regions:out}));
const bytes=out.reduce((s,r)=>s+r.d.length,0);
console.log(`regions: ${out.length}   path bytes: ${(bytes/1024).toFixed(1)}KB`);
out.forEach(r=>console.log(`  ${r.code} ${r.name.padEnd(20)} d=${String(r.d.length).padStart(6)}  c=(${r.cx},${r.cy})`));
