/* ═══════════════════════════════════════════════════════════
   Ролебаза Landing — main.js
   Logo-expand engine + theme switching + waitlist + founders
   ═══════════════════════════════════════════════════════════ */

(function () {
'use strict';

/* ── SVG namespace ─────────────────────────────────────────── */
var NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs, parent) {
  var el = document.createElementNS(NS, tag);
  if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
  if (parent) parent.appendChild(el);
  return el;
}

/* ═══════════════════════════════════════════════════════════
   1. THEME SWITCHING
   ═══════════════════════════════════════════════════════════ */

var THEMES = ['arcane', 'dark', 'light', 'parchment'];
var PALETTES = {
  arcane:    { accent: '#D4AF60', faceTop: 'rgba(212,175,96,0.37)', faceLeft: 'rgba(212,175,96,0.29)', faceRight: 'rgba(212,175,96,0.24)', isDark: true },
  dark:      { accent: '#748ffc', faceTop: 'rgba(116,143,252,0.20)', faceLeft: 'rgba(116,143,252,0.13)', faceRight: 'rgba(116,143,252,0.08)', isDark: true },
  light:     { accent: '#3b5bdb', faceTop: 'rgba(59,91,219,0.08)',   faceLeft: 'rgba(59,91,219,0.14)',   faceRight: 'rgba(59,91,219,0.20)', isDark: false },
  parchment: { accent: '#6B4A1A', faceTop: 'rgba(107,74,26,0.07)',   faceLeft: 'rgba(107,74,26,0.13)',   faceRight: 'rgba(107,74,26,0.19)', isDark: false },
};

var currentTheme = 'arcane';

document.addEventListener('DOMContentLoaded', function () {
  document.documentElement.setAttribute('data-theme', 'arcane');
});

/* ═══════════════════════════════════════════════════════════
   2. LOGO-EXPAND ENGINE (ported from LogoExpandMockup.tsx)
   ═══════════════════════════════════════════════════════════ */

var E = 44, DX = E * 0.866, DY = E * 0.5;
var GAP_SHRINK = 0.08;

var ICONS = {
  axe: [{t:'path',d:'m14 12-8.381 8.38a1 1 0 0 1-3.001-3L11 9'},{t:'path',d:'M15 15.5a.5.5 0 0 0 .5.5A6.5 6.5 0 0 0 22 9.5a.5.5 0 0 0-.5-.5h-1.672a2 2 0 0 1-1.414-.586l-5.062-5.062a1.205 1.205 0 0 0-1.704 0L9.352 5.648a1.205 1.205 0 0 0 0 1.704l5.062 5.062A2 2 0 0 1 15 13.828z'}],
  sword: [{t:'path',d:'m11 19-6-6'},{t:'path',d:'m5 21-2-2'},{t:'path',d:'m8 16-4 4'},{t:'path',d:'M9.5 17.5 21 6V3h-3L6.5 14.5'}],
  shield: [{t:'path',d:'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'}],
  flame: [{t:'path',d:'M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4'}],
  crown: [{t:'path',d:'M5 21h14'},{t:'path',d:'M11.646 3.027a.5.5 0 0 1 .708 0l2.905 2.905a.5.5 0 0 0 .707 0L19 2.898a.5.5 0 0 1 .854.353V16a1 1 0 0 1-1 1H5.25a1 1 0 0 1-1-1V3.251a.5.5 0 0 1 .854-.354L8.138 5.93a.5.5 0 0 0 .707 0z'}],
  scroll: [{t:'path',d:'M19 17V5a2 2 0 0 0-2-2H4'},{t:'path',d:'M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3'}],
  star: [{t:'path',d:'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'}],
  gem: [{t:'path',d:'M10.5 3 8 9l4 13 4-13-2.5-6'},{t:'path',d:'M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z'},{t:'path',d:'M2 9h20'}],
  compass: [{t:'circle',cx:12,cy:12,r:10},{t:'path',d:'m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z'}],
  map: [{t:'path',d:'M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z'},{t:'path',d:'M15 5.764v15'},{t:'path',d:'M9 3.236v15'}],
  dices: [{t:'path',d:'M4 10h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z'},{t:'path',d:'m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6'},{t:'path',d:'M6 18h.01'},{t:'path',d:'M10 14h.01'},{t:'path',d:'M15 6h.01'},{t:'path',d:'M18 9h.01'}],
  zap: [{t:'path',d:'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z'}],
  trophy: [{t:'path',d:'M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978'},{t:'path',d:'M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978'},{t:'path',d:'M18 9h1.5a1 1 0 0 0 0-5H18'},{t:'path',d:'M4 22h16'},{t:'path',d:'M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z'},{t:'path',d:'M6 9H4.5a1 1 0 0 1 0-5H6'}],
  bookOpen: [{t:'path',d:'M12 7v14'},{t:'path',d:'M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z'}],
  drama: [{t:'path',d:'M10 11h.01'},{t:'path',d:'M14 6h.01'},{t:'path',d:'M18 6h.01'},{t:'path',d:'M6.5 13.1h.01'},{t:'path',d:'M22 5c0 9-4 12-6 12s-6-3-6-12c0-2 2-3 6-3s6 1 6 3'},{t:'path',d:'M17.4 9.9c-.8.8-2 .8-2.8 0'},{t:'path',d:'M10.1 7.1C9 7.2 7.7 7.7 6 8.6c-3.5 2-4.7 3.9-3.7 5.6 4.5 7.8 9.5 8.4 11.2 7.4.9-.5 1.9-2.1 1.9-4.7'},{t:'path',d:'M9.1 16.5c.3-1.1 1.4-1.7 2.4-1.4'}],
};
var ALL_ICONS = Object.keys(ICONS);
function pickIcon() { return ALL_ICONS[Math.floor(Math.random() * ALL_ICONS.length)]; }

// Logo center data
var MASKS_PATHS = [
  'M424 873 c-116-95-161-106-312-79-115 21-114 23-59-180 57-210 58-214 103-264 59-65 105-85 199-85 90 0 136 19 192 77 86 90 92 173 29 405-24 89-47 167-51 173-12 19-33 10-101-47z m76-75 c6-24 23-85 37-137 33-123 29-193-13-253-58-82-178-112-264-66-69 37-95 84-139 248-22 80-38 146-37 148 2 1 27-2 56-8 120-23 193-6 280 65 30 24 58 44 62 45 4 0 12-19 18-42z',
  'M395 709 c-27-13-46-44-39-64 8-19 38-19 54 0 7 8 25 14 43 12 24-1 32 3 35 17 8 37-47 57-93 35z',
  'M203 655 c-31-13-50-46-38-65 9-15 41-12 55 5 8 9 22 12 41 8 54-10 49 45-6 60-11 4-34 0-52-8z',
  'M426 485 c-9-25-70-47-100-35-34 13-58 2-54-24 4-30 68-50 117-36 44 12 94 60 89 87-4 23-43 30-52 8z',
  'M654 505 c-4-9 0-23 7-31 17-16 103-34 166-34 l44 0-76-149 c-90-177-116-203-219-209-65-4-106 10-166 58-31 25-63 17-58-13 4-27 77-83 126-97 104-29 217 2 283 78 48 54 193 360 179 377-6 8-48 15-113 18-56 4-117 9-134 13-25 5-34 2-39-11z',
  'M642 381 c-24-15-10-46 23-49 17-2 38-11 48-20 13-12 22-13 34-6 27 17 26 32-1 59-26 26-77 34-104 16z',
  'M474 235 c-11-28 4-45 40-45 35 0 43-5 71-45 11-16 17-18 32-9 26 17 18 54-17 87-24 21-40 27-75 27-31 0-47-5-51-15z',
];
var P_GLYPH_D = 'M200 0V1200L0 1300L400 1500L600 1400V200L800 100L400 -100ZM600 1400 1000 1600 1400 1400V800L800 500L600 600L1000 800V1200Z';
var SCROLL_D = [
  'M19 17V5a2 2 0 0 0-2-2H4',
  'M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3',
];

// Geometry helpers
function hexVerts(hx, hy) {
  return { top:[hx,hy-E], tr:[hx+DX,hy-DY], r:[hx+DX,hy+DY], bot:[hx,hy+E], l:[hx-DX,hy+DY], tl:[hx-DX,hy-DY], c:[hx,hy] };
}
function faceVerts(v, face) {
  if (face==='top')  return [v.top,v.tr,v.c,v.tl];
  if (face==='left') return [v.tl,v.c,v.bot,v.l];
  return [v.c,v.tr,v.r,v.bot];
}
function shrink(pts) {
  var mx=0, my=0; pts.forEach(function(p){mx+=p[0];my+=p[1];}); mx/=pts.length; my/=pts.length;
  return pts.map(function(p){return [p[0]+(mx-p[0])*GAP_SHRINK, p[1]+(my-p[1])*GAP_SHRINK];});
}
function roundedPath(pts) {
  var n=pts.length, r=4, out=[];
  for (var i=0;i<n;i++) {
    var prev=pts[(i-1+n)%n], curr=pts[i], next=pts[(i+1)%n];
    var dxP=prev[0]-curr[0], dyP=prev[1]-curr[1], dxN=next[0]-curr[0], dyN=next[1]-curr[1];
    var lP=Math.sqrt(dxP*dxP+dyP*dyP), lN=Math.sqrt(dxN*dxN+dyN*dyN);
    var t=Math.min(r, lP*0.4, lN*0.4);
    out.push(i===0?'M ':'L '); out.push((curr[0]+dxP/lP*t)+','+(curr[1]+dyP/lP*t));
    out.push(' Q '+curr[0]+','+curr[1]+' '+(curr[0]+dxN/lN*t)+','+(curr[1]+dyN/lN*t));
  }
  out.push(' Z'); return out.join('');
}
function mtx(pts, i0, i1, i3) {
  var o=pts[i0],u=pts[i1],v=pts[i3];
  return 'matrix('+(u[0]-o[0])+','+(u[1]-o[1])+','+(v[0]-o[0])+','+(v[1]-o[1])+','+o[0]+','+o[1]+')';
}
function edgeKey(a,b) {
  var k1=Math.round(a[0]*100)+','+Math.round(a[1]*100), k2=Math.round(b[0]*100)+','+Math.round(b[1]*100);
  return k1<k2?k1+'|'+k2:k2+'|'+k1;
}

var HEX_NEIGHBORS = [[2*DX,0],[DX,1.5*E],[-DX,1.5*E],[-2*DX,0],[-DX,-1.5*E],[DX,-1.5*E]];

function buildTessellation(maxRings) {
  var hexCenters=[[0,0,0]], hexVisited=new Set(['0,0']), current=[[0,0]];
  for (var ring=1;ring<=maxRings;ring++) {
    var next=[];
    current.forEach(function(h){
      HEX_NEIGHBORS.forEach(function(d){
        var nx=h[0]+d[0], ny=h[1]+d[1], k=Math.round(nx*10)+','+Math.round(ny*10);
        if (!hexVisited.has(k)) { hexVisited.add(k); hexCenters.push([nx,ny,ring]); next.push([nx,ny]); }
      });
    });
    current=next;
  }
  var rhombs=[], edgeMap=new Map();
  hexCenters.forEach(function(hc){
    var v=hexVerts(hc[0],hc[1]);
    ['top','left','right'].forEach(function(face){
      var raw=faceVerts(v,face), idx=rhombs.length, edges=[];
      for(var i=0;i<4;i++){
        var ek=edgeKey(raw[i],raw[(i+1)%4]); edges.push(ek);
        if(!edgeMap.has(ek))edgeMap.set(ek,[]); edgeMap.get(ek).push(idx);
      }
      rhombs.push({face:face,ring:hc[2],pts:shrink(raw),rawPts:raw,icon:hc[2]===0?'':pickIcon(),edges:edges});
    });
  });
  // BFS
  var result=[], visited=new Set(), queue=[], iMap=new Map();
  for(var i=0;i<3;i++){
    visited.add(i); iMap.set(i,result.length);
    result.push({face:rhombs[i].face,ring:0,pts:rhombs[i].pts,rawPts:rhombs[i].rawPts,icon:'',bfsStep:0,rndOff:0,neighbors:[]});
    queue.push(i);
  }
  var step=1,qStart=0,levelEnd=queue.length;
  while(qStart<queue.length){
    var ri=queue[qStart++], rh=rhombs[ri];
    rh.edges.forEach(function(ek){
      edgeMap.get(ek).forEach(function(ni){
        if(visited.has(ni))return; visited.add(ni);
        iMap.set(ni,result.length);
        result.push({face:rhombs[ni].face,ring:rhombs[ni].ring,pts:rhombs[ni].pts,rawPts:rhombs[ni].rawPts,icon:rhombs[ni].icon,bfsStep:step,rndOff:Math.random(),neighbors:[]});
        queue.push(ni);
      });
    });
    if(qStart>=levelEnd){step++;levelEnd=queue.length;}
  }
  // neighbors
  for(var ri2=0;ri2<rhombs.length;ri2++){
    var resIdx=iMap.get(ri2); if(resIdx===undefined)continue;
    var ns=new Set();
    rhombs[ri2].edges.forEach(function(ek){edgeMap.get(ek).forEach(function(ni){if(ni!==ri2){var nr=iMap.get(ni);if(nr!==undefined)ns.add(nr);}});});
    result[resIdx].neighbors=Array.from(ns);
  }
  return result;
}

// Face-type indices for icon transform
function faceIdx(face){return face==='top'?[3,0,2]:[0,1,3];}

function initLogoExpand() {
  var svg = document.getElementById('logo-expand');
  if (!svg) return;

  var SCALE = 300 / 160;
  var rhombs = buildTessellation(2);
  var maxStep = 0;
  rhombs.forEach(function(r){if(r.bfsStep>maxStep)maxStep=r.bfsStep;});
  var STEP_MS = 1080;
  var expandDoneMs = (maxStep-1)*STEP_MS + STEP_MS + 600;

  // ViewBox
  var allPts=rhombs.reduce(function(a,r){return a.concat(r.pts);},[]);
  var pad=4;
  var minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  allPts.forEach(function(p){if(p[0]<minX)minX=p[0];if(p[1]<minY)minY=p[1];if(p[0]>maxX)maxX=p[0];if(p[1]>maxY)maxY=p[1];});
  minX-=pad;minY-=pad;maxX+=pad;maxY+=pad;
  var vbW=maxX-minX, vbH=maxY-minY;
  svg.setAttribute('viewBox', minX+' '+minY+' '+vbW+' '+vbH);
  svg.setAttribute('width', Math.round(vbW*SCALE));
  svg.setAttribute('height', Math.round(vbH*SCALE));

  var p = PALETTES[currentTheme];

  // Defs
  var defs = svgEl('defs',null,svg);
  var filterTL = svgEl('filter',{id:'le-tl'},defs);
  var fcmTL = svgEl('feColorMatrix',{type:'matrix'},filterTL);
  var filterTR = svgEl('filter',{id:'le-tr'},defs);
  var fcmTR = svgEl('feColorMatrix',{type:'matrix'},filterTR);
  function setFilters(pal) {
    var tl = pal.isDark ? '0.85 0 0 0 0.01 0 0.83 0 0 0 0 0 0.80 0 0 0 0 0 1 0' : '0.88 0 0 0 0 0 0.86 0 0 0 0 0 0.84 0 0 0 0 0 1 0';
    var tr = pal.isDark ? '0.75 0 0 0 0.01 0 0.72 0 0 0 0 0 0.70 0 0 0 0 0 1 0' : '0.78 0 0 0 0 0 0.75 0 0 0 0 0 0.72 0 0 0 0 0 1 0';
    fcmTL.setAttribute('values', tl);
    fcmTR.setAttribute('values', tr);
  }
  setFilters(p);

  // Render rhombs
  var groups = [];      // <g> per rhomb
  var facePaths = [];   // background <path> per rhomb
  var centerEls = [];   // center face icon elements (accent-colored)
  var expanded = false;

  rhombs.forEach(function(rh, rhIdx) {
    var isCenter = rh.bfsStep === 0;
    var filterUrl = rh.face==='left'?'url(#le-tl)':rh.face==='right'?'url(#le-tr)':null;
    var g = svgEl('g', filterUrl ? {filter: filterUrl} : null, svg);
    g.style.opacity = isCenter ? '1' : '0';
    g.style.transition = 'opacity 0.6s ease';
    groups.push(g);

    var fill = rh.face==='top'?p.faceTop:rh.face==='left'?p.faceLeft:p.faceRight;
    var bg = svgEl('path',{d:roundedPath(rh.pts),fill:fill},g);
    facePaths.push(bg);

    if (isCenter) {
      var els = renderCenterFace(rh, p, g);
      centerEls.push.apply(centerEls, els);
    }
  });

  function renderCenterFace(rh, pal, parent) {
    var els = [];
    var s = rh.pts;
    if (rh.face === 'top') {
      var cx=0,cy=0; s.forEach(function(pt){cx+=pt[0];cy+=pt[1];}); cx/=4;cy/=4;
      var sc = 28/2048;
      var pe = svgEl('path',{d:P_GLYPH_D,fill:pal.accent,transform:'translate('+cx+','+cy+') scale('+sc+','+-sc+') translate(-700,-750)'},parent);
      els.push(pe);
    } else if (rh.face === 'left') {
      var fill2=0.72,ms=fill2/96,mpad=(1-fill2)/2;
      var clipId='le-cm-'+rh.face;
      var cp = svgEl('clipPath',{id:clipId},parent);
      svgEl('polygon',{points:s.map(function(pt){return pt.join(',');}).join(' ')},cp);
      var gc = svgEl('g',{'clip-path':'url(#'+clipId+')'},parent);
      var gm = svgEl('g',{transform:mtx(s,0,1,3)},gc);
      var gm2 = svgEl('g',{transform:'translate('+mpad+','+mpad+') scale('+ms+','+ms+')'},gm);
      var gm3 = svgEl('g',{transform:'translate(0,96) scale(0.1,-0.1)',fill:pal.accent,stroke:'none'},gm2);
      MASKS_PATHS.forEach(function(d){ els.push(svgEl('path',{d:d},gm3)); });
      els.push(gm3); // for recoloring
    } else {
      var scs=0.03,spad=(1-scs*24)/2;
      var clipId2='le-cs-'+rh.face;
      var cp2 = svgEl('clipPath',{id:clipId2},parent);
      svgEl('polygon',{points:s.map(function(pt){return pt.join(',');}).join(' ')},cp2);
      var gc2 = svgEl('g',{'clip-path':'url(#'+clipId2+')'},parent);
      var gm4 = svgEl('g',{transform:mtx(s,0,1,3)},gc2);
      var gm5 = svgEl('g',{transform:'translate('+spad+','+spad+') scale('+scs+','+scs+') translate(24,0) scale(-1,1)'},gm4);
      SCROLL_D.forEach(function(d){
        var pe2 = svgEl('path',{d:d,fill:'none',stroke:pal.accent,'stroke-width':'1.5','stroke-linecap':'round','stroke-linejoin':'round','vector-effect':'non-scaling-stroke'},gm5);
        pe2.style.strokeWidth = '3px';
        els.push(pe2);
      });
      // crosshair
      var rcx=0,rcy=0; s.forEach(function(pt){rcx+=pt[0];rcy+=pt[1];}); rcx/=4;rcy/=4;
      s.forEach(function(corner){
        var dx=corner[0]-rcx, dy=corner[1]-rcy;
        var line = svgEl('line',{x1:rcx,y1:rcy,x2:rcx+dx*0.06,y2:rcy+dy*0.06,stroke:pal.accent,'stroke-linecap':'round','vector-effect':'non-scaling-stroke'},parent);
        line.style.strokeWidth = '3px';
        els.push(line);
      });
    }
    return els;
  }

  // ── Expand / collapse ──
  function expandRhombs() {
    expanded = true;
    rhombs.forEach(function(rh, i) {
      if (rh.bfsStep === 0) return;
      var stepFrom = Math.max(0, rh.bfsStep - 1);
      var delay = stepFrom * STEP_MS + rh.rndOff * STEP_MS * 0.8;
      groups[i].style.transition = 'opacity 0.6s ease ' + delay + 'ms';
      groups[i].style.opacity = '1';
    });
    startSparkles();
  }

  function collapseRhombs() {
    expanded = false;
    stopSparkles();
    rhombs.forEach(function(rh, i) {
      if (rh.bfsStep === 0) return;
      var delay = (maxStep - rh.bfsStep) * STEP_MS * 0.7 + (1 - rh.rndOff) * STEP_MS * 0.5;
      groups[i].style.transition = 'opacity 0.5s ease ' + delay + 'ms';
      groups[i].style.opacity = '0';
    });
  }

  // ── Classic logo ↔ die field state machine ──
  var classicLogo = document.getElementById('classic-logo');
  var logoStage = document.getElementById('logo-stage');
  // States: 'classic' | 'transitioning' | 'die-collapsed' | 'die-expanded'
  var phase = 'classic';

  function showDieField() {
    if (phase !== 'classic') return;
    phase = 'transitioning';
    // Fade out classic logo
    classicLogo.classList.add('fade-out');
    setTimeout(function() {
      // Show SVG, expand
      svg.classList.add('visible');
      setTimeout(function() {
        expandRhombs();
        phase = 'die-expanded';
      }, 300);
    }, 1000); // after classic fades out
  }

  function showClassicLogo() {
    if (phase !== 'die-collapsed') return;
    phase = 'transitioning';
    // Hide SVG
    svg.classList.remove('visible');
    setTimeout(function() {
      // Show classic logo
      classicLogo.classList.remove('fade-out');
      phase = 'classic';
    }, 1000);
  }

  // Compute max collapse delay for timing
  var maxCollapseDelay = 0;
  rhombs.forEach(function(rh) {
    if (rh.bfsStep === 0) return;
    var d = (maxStep - rh.bfsStep) * STEP_MS * 0.7 + (1 - rh.rndOff) * STEP_MS * 0.5 + 500;
    if (d > maxCollapseDelay) maxCollapseDelay = d;
  });

  logoStage.addEventListener('click', function() {
    if (phase === 'classic') {
      showDieField();
    } else if (phase === 'die-expanded') {
      phase = 'transitioning';
      collapseRhombs();
      // After collapse finishes → wait 3s → show classic logo
      setTimeout(function() {
        phase = 'die-collapsed';
        setTimeout(showClassicLogo, 3000);
      }, maxCollapseDelay);
    } else if (phase === 'die-collapsed') {
      // Click during 3s pause → expand again instead
      phase = 'die-expanded';
      expandRhombs();
    }
  });

  // ── Sparkle system ──
  var sparkleTimers = new Map();
  var sparkleState = new Map(); // rhIdx → { icon, tier, g (svg element), visible }
  var outerIndices = [];
  rhombs.forEach(function(r,i){ if(r.bfsStep>0) outerIndices.push(i); });
  var maxThird = Math.floor(outerIndices.length / 3);

  var TIERS = [
    {tier:'common',    weight:889, duration:5000},
    {tier:'uncommon',  color:'#4ade80', weight:100, duration:10000},
    {tier:'rare',      color:'#60a5fa', weight:10,  duration:20000},
    {tier:'epic',      color:'#b197fc', weight:4,   duration:30000},
    {tier:'legendary', color:'#f59e0b', weight:1,   duration:40000},
  ];
  var MAX_LEGENDARY = 3;
  var TIER_RANK = {common:0, uncommon:1, rare:2, epic:3, legendary:4};
  var totalWeight = TIERS.reduce(function(s,t){return s+t.weight;},0);
  function rollTier(){
    var r=Math.random()*totalWeight;
    for(var i=0;i<TIERS.length;i++){r-=TIERS[i].weight;if(r<=0)return TIERS[i];}
    return TIERS[0];
  }

  // ── Center die glow ──
  // Track the 3 center <g> elements to apply increasing glow
  var centerGroups = [];
  rhombs.forEach(function(rh,i){ if(rh.bfsStep===0) centerGroups.push(groups[i]); });

  function updateCenterGlow() {
    // Count rare+ sparkles on field
    var rareCount = 0;
    sparkleState.forEach(function(s){
      if(s.visible && TIER_RANK[s.tier] >= 2) rareCount++;
    });
    // Glow intensity: 0=none, 1-2=subtle, 3-4=medium, 5-6=strong, 7+=blazing
    var glow = '';
    var transition = 'filter 1.5s ease';
    if (rareCount >= 7) {
      glow = 'drop-shadow(0 0 6px rgba(245,158,11,0.7)) drop-shadow(0 0 14px rgba(245,158,11,0.5)) drop-shadow(0 0 28px rgba(245,158,11,0.3))';
    } else if (rareCount >= 5) {
      glow = 'drop-shadow(0 0 5px rgba(245,158,11,0.5)) drop-shadow(0 0 12px rgba(245,158,11,0.3))';
    } else if (rareCount >= 3) {
      glow = 'drop-shadow(0 0 4px rgba(212,175,96,0.5)) drop-shadow(0 0 8px rgba(212,175,96,0.25))';
    } else if (rareCount >= 1) {
      glow = 'drop-shadow(0 0 3px rgba(212,175,96,0.3))';
    }
    centerGroups.forEach(function(g){
      g.style.transition = transition;
      g.style.filter = g._baseFilter ? (g._baseFilter + ' ' + glow) : glow;
    });
  }
  // Store base filters (tint) on center groups
  centerGroups.forEach(function(g){ g._baseFilter = g.getAttribute('filter') ? '' : ''; });
  // Note: center top has no filter, left has url(#le-tl), right has url(#le-tr)
  // SVG filter attr and CSS filter are separate — CSS filter stacks on top, which is what we want.

  function startSparkles() {
    var startTimer = setTimeout(function(){
      var interval = setInterval(function(){
        var active=0; sparkleState.forEach(function(s){if(s.visible)active++;});
        if(active>=maxThird) return;

        var activeSet=new Set();
        sparkleState.forEach(function(s,k){if(s.visible)activeSet.add(k);});
        var neighborBlock=new Set();
        activeSet.forEach(function(ai){neighborBlock.add(ai);rhombs[ai].neighbors.forEach(function(ni){neighborBlock.add(ni);});});
        var available=outerIndices.filter(function(i){return !sparkleState.has(i)&&!neighborBlock.has(i);});
        if(!available.length)return;

        var usedIcons=new Set(); sparkleState.forEach(function(s){usedIcons.add(s.icon);});
        var freeIcons=ALL_ICONS.filter(function(ic){return !usedIcons.has(ic);});
        if(!freeIcons.length)return;

        var idx=available[Math.floor(Math.random()*available.length)];
        var icon=freeIcons[Math.floor(Math.random()*freeIcons.length)];

        // Tier counts for promotion chain: 3 green→blue, 4 blue→purple, 5 purple→legendary
        var activeTiers=[]; sparkleState.forEach(function(s){if(s.visible)activeTiers.push(s.tier);});
        var uncommonCount = activeTiers.filter(function(t){return t==='uncommon';}).length;
        var rareCount     = activeTiers.filter(function(t){return t==='rare';}).length;
        var epicCount     = activeTiers.filter(function(t){return t==='epic';}).length;
        var legendaryCount= activeTiers.filter(function(t){return t==='legendary';}).length;

        var tier;
        if (epicCount >= 5 && legendaryCount < MAX_LEGENDARY) tier = TIERS[4];  // 5 purple → legendary
        else if (rareCount >= 4) tier = TIERS[3];      // 4 blue → purple
        else if (uncommonCount >= 3) tier = TIERS[2];  // 3 green → blue
        else tier = rollTier();
        // Enforce legendary cap
        if (tier.tier === 'legendary' && legendaryCount >= MAX_LEGENDARY) tier = TIERS[3];

        var pal = PALETTES[currentTheme];
        var strokeColor = tier.tier==='common' ? pal.accent : tier.color;
        var rh=rhombs[idx];
        var fi=faceIdx(rh.face);
        var ss=0.025, sPad=(1-ss*24)/2;

        var sg=svgEl('g',null,groups[idx]);
        sg.style.opacity='0'; sg.style.transition='opacity 0.6s ease';
        if(tier.tier==='legendary') sg.style.filter='drop-shadow(0 0 4px '+strokeColor+') drop-shadow(0 0 8px '+strokeColor+')';
        else if(tier.tier==='epic') sg.style.filter='drop-shadow(0 0 4px '+strokeColor+') drop-shadow(0 0 6px '+strokeColor+')';
        else if(tier.tier==='rare') sg.style.filter='drop-shadow(0 0 3px '+strokeColor+')';

        var clipId='le-sp-'+idx;
        var cpEl=svgEl('clipPath',{id:clipId},sg);
        svgEl('polygon',{points:rh.pts.map(function(pt){return pt.join(',');}).join(' ')},cpEl);
        var gcEl=svgEl('g',{'clip-path':'url(#'+clipId+')'},sg);
        var gmEl=svgEl('g',{transform:mtx(rh.pts,fi[0],fi[1],fi[2])},gcEl);
        var gIcon=svgEl('g',{transform:'translate('+sPad+','+sPad+') scale('+ss+','+ss+')'},gmEl);

        ICONS[icon].forEach(function(el){
          if(el.t==='path') svgEl('path',{d:el.d,fill:'none',stroke:strokeColor,'stroke-width':'1.5','stroke-linecap':'round','stroke-linejoin':'round','vector-effect':'non-scaling-stroke',style:'stroke-width:2.5px'},gIcon);
          else svgEl('circle',{cx:el.cx,cy:el.cy,r:el.r,fill:'none',stroke:strokeColor,'stroke-width':'1.5','stroke-linecap':'round','stroke-linejoin':'round','vector-effect':'non-scaling-stroke',style:'stroke-width:2.5px'},gIcon);
        });

        var isHighTier = tier.tier==='legendary' || tier.tier==='epic';
        requestAnimationFrame(function(){sg.style.opacity=isHighTier?'1':'0.8';});
        if(tier.tier==='legendary') sg.style.animation='sparkle-pulse 2s ease-in-out infinite';
        else if(tier.tier==='epic') sg.style.animation='sparkle-pulse 3s ease-in-out infinite';

        sparkleState.set(idx, {icon:icon,tier:tier.tier,g:sg,visible:true});
        updateCenterGlow();

        var fadeTimer=setTimeout(function(){
          sg.style.opacity='0';
          var removeTimer=setTimeout(function(){
            sg.parentNode.removeChild(sg);
            sparkleState.delete(idx);
            sparkleTimers.delete(idx);
            updateCenterGlow();
          },600);
          sparkleTimers.set(idx,removeTimer);
          sparkleState.set(idx,{icon:icon,tier:tier.tier,g:sg,visible:false});
          updateCenterGlow();
        },tier.duration);
        sparkleTimers.set(idx,fadeTimer);

      }, 500);
      sparkleTimers.set(-1,interval);
    }, expandDoneMs);
    sparkleTimers.set(-2,startTimer);
  }

  function stopSparkles() {
    sparkleTimers.forEach(function(t){clearTimeout(t);clearInterval(t);});
    sparkleTimers.clear();
    sparkleState.forEach(function(s){if(s.g&&s.g.parentNode)s.g.parentNode.removeChild(s.g);});
    sparkleState.clear();
    // Reset center glow
    centerGroups.forEach(function(g){ g.style.filter = ''; });
  }

  // Recolor API
  window._logoExpand = {
    recolor: function(pal) {
      setFilters(pal);
      rhombs.forEach(function(rh,i){
        var fill=rh.face==='top'?pal.faceTop:rh.face==='left'?pal.faceLeft:pal.faceRight;
        facePaths[i].setAttribute('fill',fill);
      });
      // Recolor center elements
      centerEls.forEach(function(el){
        if(el.tagName==='path'&&el.getAttribute('fill')&&el.getAttribute('fill')!=='none') el.setAttribute('fill',pal.accent);
        if(el.tagName==='path'&&el.getAttribute('stroke')) el.setAttribute('stroke',pal.accent);
        if(el.tagName==='line') el.setAttribute('stroke',pal.accent);
        if(el.tagName==='g'&&el.getAttribute('fill')) el.setAttribute('fill',pal.accent);
      });
      // Restart sparkles with new colors
      if(expanded){ stopSparkles(); startSparkles(); }
    }
  };
}

document.addEventListener('DOMContentLoaded', initLogoExpand);

/* (header removed — no scroll listener needed) */

/* ═══════════════════════════════════════════════════════════
   4. FADE-IN ON SCROLL
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {
  var els = document.querySelectorAll('.fade-in');
  if (!els.length) return;
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  els.forEach(function (el) { obs.observe(el); });
});

/* ═══════════════════════════════════════════════════════════
   5. WAITLIST COUNTER
   ═══════════════════════════════════════════════════════════ */

(function () {
  var counterTarget = 0, counterHasValue = false, counterInView = false, counterAnimated = false;
  var counterRetryAttempt = 0, counterRetryTimer = null;

  function parseTotal(v, fb) { var n = parseInt(v, 10); return isNaN(n) ? fb : n; }

  function setLoading(on) {
    var sp = document.getElementById('member-count-spinner');
    var ct = document.getElementById('member-count');
    if (sp) sp.style.display = on ? 'inline-block' : 'none';
    if (ct) ct.style.display = on ? 'none' : 'inline';
  }

  function animateCounter() {
    if (counterAnimated || !counterHasValue) return;
    counterAnimated = true;
    var el = document.getElementById('member-count');
    if (!el) return;
    setLoading(false);
    var start = 0, dur = 2000, step = Math.max(1, Math.ceil(counterTarget / (dur / 16)));
    var iv = setInterval(function () {
      start = Math.min(start + step, counterTarget);
      el.textContent = start;
      if (start >= counterTarget) clearInterval(iv);
    }, 16);
  }

  function scheduleRetry() {
    if (counterRetryAttempt >= 4) return;
    var delays = [1000, 3000, 7000, 15000];
    counterRetryTimer = setTimeout(loadCount, delays[counterRetryAttempt]);
    counterRetryAttempt++;
  }

  function loadCount() {
    fetch('https://beta.rolebaza.ru/api/landing/waitlist/count')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        counterTarget = parseTotal(d.total, 0);
        counterHasValue = true;
        counterRetryAttempt = 0;
        if (counterInView) animateCounter(); else setLoading(false);
      })
      .catch(function () { setLoading(true); scheduleRetry(); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadCount();
    var section = document.getElementById('waitlist');
    if (!section) return;
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { counterInView = true; if (counterHasValue && !counterAnimated) animateCounter(); }
      });
    }, { threshold: 0.3 }).observe(section);
  });

  window._waitlist = {
    updateTotal: function (v) {
      counterTarget = parseTotal(v, counterTarget);
      counterHasValue = true;
      var el = document.getElementById('member-count');
      if (el) { el.textContent = counterTarget; setLoading(false); }
    }
  };
})();

/* ═══════════════════════════════════════════════════════════
   6. FOUNDER MEDALLION CAROUSEL
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {
  var portraits = document.getElementById('founder-portraits');
  var details = document.getElementById('founder-details');
  if (!portraits || !details) return;

  var buttons = portraits.querySelectorAll('.founder-btn');
  var pages = details.querySelectorAll('.founder-page');
  var count = buttons.length;

  function activate(idx) {
    buttons.forEach(function (b, i) { b.classList.toggle('active', i === idx); });
    pages.forEach(function (p, i) { p.classList.toggle('visible', i === idx); });
  }

  // Persistence (cookie + localStorage)
  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function getCounter() {
    var v = getCookie('rb_founder_cycle_counter');
    if (v !== null) return parseInt(v, 10) || 0;
    try { var s = localStorage.getItem('rb_founder_cycle_counter'); return s ? parseInt(s, 10) || 0 : 0; } catch (e) { return 0; }
  }
  function setCounter(val) {
    var s = String(val);
    try { document.cookie = 'rb_founder_cycle_counter=' + s + ';max-age=31536000;path=/;SameSite=Lax'; } catch (e) {}
    try { localStorage.setItem('rb_founder_cycle_counter', s); } catch (e) {}
  }

  var counter = getCounter();
  var initial = counter % count;
  activate(initial);
  setCounter(counter + 1);

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var idx = parseInt(btn.getAttribute('data-founder'), 10);
      activate(idx);
    });
  });
});

/* ═══════════════════════════════════════════════════════════
   7. WAITLIST FORM SUBMISSION
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('waitlist-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var status = document.getElementById('waitlist-status');
    var btn = form.querySelector('.btn');
    if (status) { status.className = 'status-msg'; status.textContent = ''; }

    var name = (form.querySelector('[name="name"]').value || '').trim();
    var email = (form.querySelector('[name="email"]').value || '').trim();
    var role = (form.querySelector('[name="role"]:checked') || {}).value || 'gm';
    var hp = (form.querySelector('[name="website"]').value || '').trim();

    if (btn) { btn.textContent = 'Записываем в летопись...'; btn.disabled = true; }

    fetch('https://beta.rolebaza.ru/api/landing/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, email: email, role: role, website: hp, source: location.href })
    })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.total && window._waitlist) window._waitlist.updateTotal(d.total);
      if (status) { status.className = 'status-msg visible success'; status.textContent = 'Принято! Мы записали тебя в гильдию.'; }
      if (btn) { btn.textContent = 'Вы приняты!'; }
      form.reset();
      setTimeout(function () { if (btn) { btn.textContent = 'Вступить в Гильдию'; btn.disabled = false; } }, 3000);
    })
    .catch(function () {
      if (status) { status.className = 'status-msg visible error'; status.textContent = 'Не удалось отправить форму. Попробуйте ещё раз через минуту.'; }
      if (btn) { btn.textContent = 'Вступить в Гильдию'; btn.disabled = false; }
    });
  });
});

})();
