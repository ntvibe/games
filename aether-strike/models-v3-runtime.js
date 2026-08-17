import { buildPlayerShip as buildPlayerBase, buildEnemyModel as buildEnemyBase, buildBossModel as buildBossBase, buildPickup as buildPickupBase, animateModel as animateBase, mats } from './models-v4-final.js';

const coarse = matchMedia('(pointer: coarse)').matches;

export { mats };

export function buildPlayerShip(){
  const g=buildPlayerBase();
  g.userData.modelTier='img2threejs-v4-pass3';

  const flames=(g.userData.flames||[]).filter(Boolean);
  for(const flame of flames) flame.userData.flame=true;

  if(coarse && flames.length){
    const fullTraverse=g.traverse;
    let fullTraversalBudget=1;
    g.traverse=function(callback){
      if(fullTraversalBudget>0){
        fullTraversalBudget--;
        return fullTraverse.call(this,callback);
      }
      callback(this);
      for(const flame of flames) callback(flame);
    };
    g.userData.mobileFastTraverse=true;
  }

  return g;
}

export function buildEnemyModel(type='scout'){
  const g=buildEnemyBase(type);
  g.rotation.y=Math.PI;
  g.userData.modelTier='aaa-v3';
  return g;
}

export function buildBossModel(){
  const g=buildBossBase();
  g.rotation.y=Math.PI;
  g.userData.modelTier='aaa-v3';
  return g;
}

export function buildPickup(kind='shield'){ return buildPickupBase(kind); }
export function animateModel(model,dt,time,intensity=1){ animateBase(model,dt,time,intensity); }
