"use strict";

class PixiTransition {
	
	constructor (displayObject, options = {}, callback = () => true) {
		
		this.options = {
			speed: GAME_SPEED,
			timeout: 10000,
			delay: 0,
		};
		
		Object.assign(this.options, options);
		this.displayObject = displayObject;
		this.callback = callback;
		this.ticker = new PIXI.Ticker();
		this.ticker.speed = this.options.speed;
		this.ticker.add(this.update, this);
		this.frame = 0;
		this.totalTime = 0;
		this.delay = this.options.delay;
		this.timeout = this.options.timeout;
		this.started = false;
		this.next = false;
		this.also = false;
		
		return this;
	}
	
	start() {
		if (!this.started) {
			this.started = true;
			if (this.also) {
				this.also.start();
			}
			//this.ticker.start();
			setTimeout(function (ticker) { ticker.start(); }, this.delay, this.ticker);
		}
	}
	
	stop() {
		this.ticker.stop();
		//this.ticker.remove(this.update, this);
		this.ticker.destroy();
	}
	
	then (next) {
		
		if (this.next === false) {
			this.callback = function () { next.start(); };
			this.next = next;
		} else {
			this.next.then(next);
		}
		
		return this;
	}
	
	and (also) {
		if (this.also === false) {
			this.also = also;
		} else {
			this.also.and(also);
		}
		
		return this;
	}
	
	
	// use this to set the callback from outside the class - places the callback on the last in the chain
	setCallback (callback) {
		if (this.next === false) {
			this.callback = callback;
		} else {
			this.next.setCallback(callback);
		}	
	}
	
	onTimeout () {
		console.log('Animation timed out.');
	}
	
	animate (delta) {
		
	}
	
	// returns true if this AND any callbacks (chained) transitions are complete
	isComplete () {
		let complete = this.checkComplete();
		if (complete && this.next !== false) {
			complete = this.next.isComplete();
		}
		return complete;
	}
	
	// returns true if this transition is complete (does not check chained callbacks)
	checkComplete () {
		return true;
	}
	
	update (delta) {
		//this.totalTime += time;
		if (this.checkComplete()) {
			this.stop();
			this.callback();
		} else if (false) {
			this.stop();
			this.onTimeout();
			this.callback();
		} else {
			requestAnimationFrame(function () { this.animate(delta); }.bind(this));
		}
	}
	
}

class Tween {
	
	constructor (startValue, endValue, options = {}) {
		
		this.options = {
			velocity: 0,
			duration: 1000,
			timing: 'linear',
			fps: 60,
		}
		
		Object.assign(this.options, options);
		
		this.startValue = this.value = startValue;
		this.endValue = endValue;
		this.delta = this.endValue - this.value;
		
		if (this.options.velocity == 0) {
			this.options.velocity = this.velocity = this.delta / (this.options.duration / 1000 * this.options.fps);
		} else {
			this.velocity = this.options.velocity;
		}
		
	}
	
	move (time) {
		this.value += this.velocity >= 0 ? Math.min(time * this.velocity, this.delta) : Math.max(time * this.velocity, this.delta);
		this.delta = this.endValue - this.value;
		return this.value;
	}
	
}

class TransitionType extends PixiTransition {
	constructor (displayObject = new PIXI.Text, options = {}, callback = () => true) {
		
		let defaultOptions = {
			text: '',
			velocity: TEXT_SPEED,
			pauseDuration: TEXT_SPEED * 1000, // how long to pause at the end
		}
				
		options = Object.assign(defaultOptions, options);
		super (displayObject, defaultOptions, callback);
		
		this.textLength = 0;
		this.then(new TransitionPause(this.options.pauseDuration));
		
		return this;
	}
	
	checkComplete() {

		return (this.textLength >= this.options.text.length);

	}
	
	onTimeout() {
		console.log('Transition scale timed out.');
		this.displayObject.text = this.options.text;
	}
	
	animate (delta) {
		this.textLength += delta * this.options.velocity;
		this.displayObject.text = this.options.text.substring(0, Math.floor(this.textLength));		
	}
}

class TransitionSlide extends PixiTransition {
	
	constructor (displayObject = new PIXI.DisplayObject, options = {}, callback = () => true) {
		
		let defaultOptions = {
			x: 0,
			y: 0,
			duration: 1000
		}
		
		options = Object.assign(defaultOptions, options);
		
		super (displayObject, defaultOptions, callback);
		
		this.deltaX = this.options.x - displayObject.x;
		this.deltaY = this.options.y - displayObject.y;
		
		this.velocityX = this.deltaX / (this.options.duration / 1000 * 60);
		this.velocityY = this.deltaY / (this.options.duration / 1000 * 60);
		
		return this;
	}
	
	checkComplete() {
		let o = this.displayObject;
		return (o.x == this.options.x) && (o.y == this.options.y);
	}
	
	onTimeout() {
		console.log('Transition slide timed out.');
		let o = this.displayObject;
		o.x = this.options.x;
		o.y = this.options.y;
	}
	
	animate (delta) {
		let o = this.displayObject;
		this.deltaX = this.options.x - o.x;
		this.deltaY = this.options.y - o.y;
		o.x += this.velocityX >= 0 ? Math.min(delta * this.velocityX, this.deltaX) : Math.max(delta * this.velocityX, this.deltaX);
		o.y += this.velocityY >= 0 ? Math.min(delta * this.velocityY, this.deltaY) : Math.max(delta * this.velocityY, this.deltaY);
	}	
}

class TransitionFlip extends PixiTransition {
	
	constructor (displayObject = new PIXI.DisplayObject, textureBack = new PIXI.Texture, options = {}, callback = () => true) {
		let defaultOptions = {
			velocity: 0.05,
		}
		
		options = Object.assign(defaultOptions, options);
		
		super (displayObject, defaultOptions, callback);
		
		
		this.textureBack = textureBack;
		
		let step1 = new TransitionScale(this.displayObject, {startScaleX: 1, endScaleX: 0, duration: 250});
		let step2 = new TransitionTextureSwap(this.displayObject, textureBack);
		let step3 = new TransitionScale(this.displayObject, {startScaleX: 0, endScaleX: 1, duration: 250});
		
		this.then(step1).then(step2).then(step3);
		
		return this;
	}
	
	onTimeout () {
		this.displayObject.scale.x = 1;
		this.displayObject.texture = this.textureBack;
	}
	
}

class TransitionTextureSwap extends PixiTransition {
	
	constructor (displayObject = new PIXI.DisplayObject, texture = new PIXI.Texture, options = {}, callback = () => true ) {
		super(displayObject);
		this.texture = texture;
		this.textureSet = false;
	}
	
	checkComplete () {
		return this.textureSet;
	}
	
	animate (time) {
		this.displayObject.texture = this.texture;
		this.textureSet = true;
	}
	
}

class TransitionPause extends PixiTransition {
	
	constructor (delayMS = PAUSE_DURATION) {
		
		super(undefined, { delay: delayMS, timeout: 300000 });
		this.finished = false;
		return this;
	}
	
	checkComplete () {
		return this.finished;
	}
	
	animate () {
		this.finished = true;
	}
	
}


class TransitionHide extends PixiTransition {
	
	constructor (displayObject = new PIXI.DisplayObject) {
		
		super(displayObject);
		return this;
	}
	
	checkComplete () {
		return !this.displayObject.visible;
	}
	
	animate (time) {
		this.displayObject.visible = false;
	}	
	
}

class TransitionDestroy extends PixiTransition {
	
	constructor (displayObject = new PIXI.DisplayObject) {
		
		super(displayObject);
		this.destroyed = false;
		return this;
	}
	
	checkComplete () {
		return this.destroyed;
	}
	
	animate (time) {
		this.displayObject.destroy();
		this.destroyed = true;
	}	
	
}

class TransitionScale extends PixiTransition {
	constructor (displayObject = new PIXI.DisplayObject, options = {}, callback = () => true) {
		
		let defaultOptions = {
			startScaleX: displayObject.scale.x,
			startScaleY: displayObject.scale.y,
			endScaleX: 1,
			endScaleY: 1,
			velocity: 0,
			duration: 500,
		}
		
		options = Object.assign(defaultOptions, options);
		
		super (displayObject, defaultOptions, callback);
				
		this.tweenX = new Tween(this.options.startScaleX, this.options.endScaleX, { velocity: this.options.velocity, duration: this.options.duration });
		this.tweenY = new Tween(this.options.startScaleY, this.options.endScaleY, { velocity: this.options.velocity, duration: this.options.duration });
		
		return this;
	}
	
	checkComplete() {
		return this.tweenX.delta == 0 && this.tweenY.delta == 0;
	}
	
	onTimeout() {
		console.log('Transition scale timed out.');
		let scale = this.displayObject.scale;
		scale.x = this.options.endScaleX;
		scale.y = this.options.endScaleY;
	}
	
	animate (time) {
		let scale = this.displayObject.scale;
		scale.x = this.tweenX.move(time);
		scale.y = this.tweenY.move(time);
	}
}
