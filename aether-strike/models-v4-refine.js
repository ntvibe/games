import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  buildPlayerShip as buildPlayerBase,
  buildEnemyModel, buildBossModel, buildPickup, animateModel, mats
} from './models-v4.js';

export { buildEnemyModel, buildBossModel, buildPickup, animateModel, mats };
const shadow=m=>{m.castShadow=true;return m};
const rb=(w,h,d,mat=mats.mid,r=.04)=>shadow(new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w*.4,h*.4,d*.4)),mat));
const cyl=(r,h,mat=mats.dark,seg=16)=>shadow(new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg),mat));
function prismXZ(points,t=.05){const n=points.length,p=[];for(const y of [-t*.5,t*.5])for(const [x,z] of points)p.push(x,y,z);const idx=[];for(let i=1;i<n-1;i++)idx.push(0,i+1,i,n,n+i,n+i+1);for(let i=0;i<n;i++){const j=(i+1)%n;idx.push(i,j,n+j,i,n+j,n+i)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g}
const plate=(pts,t,mat)=>shadow(new THREE.Mesh(prismXZ(pts,t),mat));

function addArmorStairs(ship){
  for(const s of [-1,1]){
    const xs=[.49,.57,.64,.7], zs=[-.7,-.08,.52,1.08];
    for(let i=0;i<4;i++){
      const tile=rb(.28-i*.018,.055,.52,mats.light,.025);tile.position.set(s*xs[i],.55-i*.025,zs[i]);tile.rotation.y=s*(.025+i*.012);ship.add(tile);
      const seam=rb(.025,.02,.42,mats.dark,.006);seam.position.set(s*(xs[i]+.15*s),.585-i*.025,zs[i]);ship.add(seam);
    }
    const shoulder=rb(.32,.24,1.22,mats.dark,.065);shoulder.position.set(s*.86,.2,.52);shoulder.rotation.y=s*.045;ship.add(shoulder);
    for(let k=0;k<3;k++){const glow=rb(.055,.025,.15,k===1?mats.cyan:mats.violet,.007);glow.position.set(s*.89,.34,.18+k*.35);ship.add(glow)}
  }
}
function addEngineShrouds(ship){
  const engines=ship.userData.engines||[];
  engines.forEach((e,i)=>{
    const s=i?1:-1;
    const top=rb(.64,.115,.86,mats.light,.045);top.position.set(0,.44,.15);e.add(top);
    const outer=rb(.14,.38,.9,mats.mid,.04);outer.position.set(s*.48,.08,.12);e.add(outer);
    const red=rb(.08,.26,.54,mats.redBright,.025);red.position.set(s*.57,.12,.23);e.add(red);
    for(let k=0;k<3;k++){const band=rb(.055,.22,.045,mats.dark,.01);band.position.set(-s*.31,.12,-.25+k*.3);e.add(band)}
  });
  const grille=rb(.62,.38,.16,mats.mech,.035);grille.position.set(0,-.02,1.86);ship.add(grille);
  for(let i=0;i<6;i++){const slat=rb(.055,.28,.035,mats.dark,.007);slat.position.set((i-2.5)*.085,-.01,1.955);ship.add(slat)}
  for(const s of [-1,1]){const lamp=rb(.17,.04,.06,mats.amber,.01);lamp.position.set(s*.22,.15,1.96);ship.add(lamp)}
}
function addWingSegmentation(ship){
  for(const s of [-1,1]){
    const panels=[
      [[s*.76,.48],[s*1.45,.53],[s*1.35,-.04],[s*.78,-.2]],
      [[s*1.5,.5],[s*2.18,.48],[s*2.0,-.2],[s*1.42,-.06]],
      [[s*2.22,.45],[s*2.79,.42],[s*2.63,-.08],[s*2.04,-.2]],
    ];
    panels.forEach((pts,i)=>{const p=plate(pts,.032,i===2?mats.mid:mats.light);p.position.y=.165+i*.006;ship.add(p)});
    const tipRed=plate([[s*2.74,.37],[s*3.14,.62],[s*3.02,-.12],[s*2.67,-.16]],.04,mats.redBright);tipRed.position.y=.17;ship.add(tipRed);
    const trench=rb(.12,.055,1.04,mats.mech,.025);trench.position.set(s*1.48,.17,.04);trench.rotation.y=s*.11;ship.add(trench);
    const rail=rb(.13,.12,1.25,mats.dark,.035);rail.position.set(s*2.03,-.27,-.22);rail.rotation.y=s*.04;ship.add(rail);
    const barrel=cyl(.042,.72,mats.mech,10);barrel.rotation.x=Math.PI/2;barrel.position.set(s*2.03,-.28,-1.17);ship.add(barrel);
  }
}
function addCanopyAndNoseDetails(ship){
  for(let i=0;i<3;i++){const rib=rb(.76-i*.08,.035,.035,mats.mid,.008);rib.position.set(0,.68-i*.035,-1.92+i*.52);ship.add(rib)}
  for(const s of [-1,1]){
    const noseRail=rb(.05,.04,1.38,mats.dark,.012);noseRail.position.set(s*.31,.28,-2.55);noseRail.rotation.y=s*.035;ship.add(noseRail);
    for(let i=0;i<4;i++){const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.018,6),mats.mid);bolt.rotation.x=Math.PI/2;bolt.position.set(s*.39,.32,-2.72+i*.25);ship.add(bolt)}
  }
  const noseGlow=rb(.12,.025,.18,mats.violet,.008);noseGlow.position.set(0,.25,-2.74);ship.add(noseGlow);
}

export function buildPlayerShip(){
  const ship=buildPlayerBase();
  addArmorStairs(ship);addEngineShrouds(ship);addWingSegmentation(ship);addCanopyAndNoseDetails(ship);
  ship.userData.sculptVersion='img2threejs-v4-pass2';ship.userData.refinePass=2;
  ship.userData.detailInventory.push('stepped fuselage armor','partially buried engine shrouds','central rear grille','segmented wing skin','underwing weapon rails','canopy cross ribs','nose fastener lines');
  return ship;
}
