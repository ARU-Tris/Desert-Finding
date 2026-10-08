import { createDesert, TARGET_AREA_M2, WALKING_SPEED, PIXELS_PER_METER } from '../src/world.js';
import { movementVector, TAU } from '../src/math.js';
const world=createDesert(),samples=32768,angle=TAU/samples;
let twiceArea=0,previous=movementVector(0,world.radiusAt(0)),minimum=Infinity,maximum=0;
for(let i=1;i<=samples;i++) {
  const radius=world.radiusAt(i*angle),current=movementVector(i*angle,radius);
  twiceArea+=previous.x*current.y-current.x*previous.y;
  previous=current;minimum=Math.min(minimum,radius);maximum=Math.max(maximum,radius);
}
const measured=Math.abs(twiceArea)/2,circleRadius=Math.sqrt(TARGET_AREA_M2/Math.PI);
console.log(JSON.stringify({seed:world.seed,targetAreaKm2:TARGET_AREA_M2/1e6,polygonAreaKm2:measured/1e6,
  areaErrorPercent:(measured/TARGET_AREA_M2-1)*100,metersPerSecond:WALKING_SPEED,logicalPixelsPerSecond:WALKING_SPEED*PIXELS_PER_METER,
  minimumRadiusKm:minimum/1000,maximumRadiusKm:maximum/1000,equalAreaCircleRadiusKm:circleRadius/1000,
  equalAreaCircleHours:circleRadius/5000,equalAreaCircleDays:circleRadius/5000/24,
  cardinals:[0,90,180,270].map(degrees=>({bearing:degrees,km:world.radiusAt(degrees*Math.PI/180)/1000,hoursAt5Kmh:world.radiusAt(degrees*Math.PI/180)/5000}))},null,2));
