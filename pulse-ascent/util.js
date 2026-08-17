export const SETTINGS={bpm:128,maxLocks:8,maxTargets:44,worldSpeed:17,bossBar:28,endBar:44};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const TAU=Math.PI*2;
export const rand=(a=0,b=1)=>a+Math.random()*(b-a);
