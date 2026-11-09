export class ActivationSequence{
 constructor(now=()=>Date.now()){this.now=now;this.reset()}
 reset(){this.count=0;this.last=0}
 press(value){const at=this.now();if(value!=='ar'){this.reset();return false}if(at-this.last>2200)this.count=0;this.last=at;if(++this.count===6){this.reset();return true}return false}
}
