import { buildPlayerShip as buildPlayerBase, buildEnemyModel as buildEnemyBase, buildBossModel as buildBossBase, buildPickup as buildPickupBase, animateModel as animateBase, mats } from './models-v3.js';

export { mats };

export function buildPlayerShip(){
  return buildPlayerBase();
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

export function buildPickup(kind='shield'){
  return buildPickupBase(kind);
}

export function animateModel(model,dt,time,intensity=1){
  animateBase(model,dt,time,intensity);
}
