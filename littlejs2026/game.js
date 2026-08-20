/*
    LittleJS JS13K Starter Game
    - For size limited projects
    - Includes all core engine features
    - Builds to 7kb zip file
*/

//'use strict';

let intro = false;
let gameStarted = false;
let gameEnded = false;
let win = false;
let lose = false;
let levelTint = rgb(1,1,1,1);
let vertScrollSpeed = .1;
let player;
let bouncingBullets = false;
var bullets = [];

// music section
let audio = document.createElement("audio");
audio.loop = true;
audio.volume = 1.0;
let msc_title_src, msc_track1_src, msc_lose_src, snd_colorcollect_src, snd_enemydie_src;

// game variables
let particleEmitter;

// Initialize music generation (player).
var t0 = new Date();
var title_player = new CPlayer();
title_player.init(title_song);

// Generate music...
var title_done = false;
setInterval(function () {
    if (title_done) {
      return;
    }

    title_done = title_player.generate() >= 1;

    if (title_done) {
      var t1 = new Date();
      console.log("msc title generate done (" + (t1 - t0) + "ms)");

      // Put the generated song in an Audio element.
      var wave = title_player.createWave();
      msc_title_src = URL.createObjectURL(new Blob([wave], {type: "audio/wav"}));

      play_music("title");
    }
});

// Initialize music generation (player).
var t0 = new Date();
var track1_player = new CPlayer();
track1_player.init(track1_song);

// Generate music...
var track1_done = false;
setInterval(function () {
    if (track1_done) {
      return;
    }

    track1_done = track1_player.generate() >= 1;

    if (track1_done) {
      var t1 = new Date();
      console.log("msc track1 generate done (" + (t1 - t0) + "ms)");

      // Put the generated song in an Audio element.
      var wave = track1_player.createWave();
      msc_track1_src = URL.createObjectURL(new Blob([wave], {type: "audio/wav"}));
    }
});

// Initialize music generation (player).
var t0 = new Date();
var lose_player = new CPlayer();
lose_player.init(lose_song);

// Generate music...
var lose_done = false;
setInterval(function () {
    if (lose_done) {
      return;
    }

    lose_done = lose_player.generate() >= 1;

    if (lose_done) {
      var t1 = new Date();
      console.log("msc lose generate done (" + (t1 - t0) + "ms)");

      // Put the generated song in an Audio element.
      var wave = lose_player.createWave();
      msc_lose_src = URL.createObjectURL(new Blob([wave], {type: "audio/wav"}));
    }
});

let snd = document.createElement("audio");
snd.loop = false;
snd.volume = 1.0;

var colorcollect_player = new CPlayer();
colorcollect_player.init(colorcollect_song);

var colorcollect_done = false;
setInterval(function () {
    if (colorcollect_done) {
      return;
    }

    colorcollect_done = colorcollect_player.generate() >= 1;

    if (colorcollect_done) {
      var t1 = new Date();
      console.log("snd colorcollect generate done (" + (t1 - t0) + "ms)");

      // Put the generated song in an Audio element.
      var wave = colorcollect_player.createWave();
      snd_colorcollect_src = URL.createObjectURL(new Blob([wave], {type: "audio/wav"}));
    }
});

var enemydie_player = new CPlayer();
enemydie_player.init(enemydie_song);

var enemydie_done = false;
setInterval(function () {
    if (enemydie_done) {
      return;
    }

    enemydie_done = enemydie_player.generate() >= 1;

    if (enemydie_done) {
      var t1 = new Date();
      console.log("snd enemydie generate done (" + (t1 - t0) + "ms)");

      // Put the generated song in an Audio element.
      var wave = enemydie_player.createWave();
      snd_enemydie_src = URL.createObjectURL(new Blob([wave], {type: "audio/wav"}));
    }
});

function play_sound(type) {
    snd.currentTime = 0.0;

    if(type == "color_collect") {
        snd.volume = 0.3;
        snd.src = snd_colorcollect_src;

        snd.play();
    }

    if(type == "enemy_die") {
        snd.volume = 0.3;
        snd.src = snd_enemydie_src;

        snd.play();
    }
}

function play_music(type) {
    audio.pause();
    audio.currentTime = 0.0;

    if(type == "title") {
        audio.volume = 1.0;
        audio.src = msc_title_src;
    }

    if(type == "track1") {
        audio.volume = 0.3;
        audio.src = msc_track1_src;
    }

    if(type == "lose") {
        audio.volume = 1.0;
        audio.src = msc_lose_src;
    }

    audio.play();
}

function toggle_music() {
    if(audio.paused) {
        audio.play();
    } else {
        audio.pause();
    }
}

function stop_music(type) {
    audio.pause();
    audio.currentTime = 0.0;
}

class Player extends EngineObject {
    constructor(pos)
    {
        super(pos, vec2(2), null, 0, BLACK);
        this.setCollision(); // make object collide
        this.renderOrder = 1; // render player on top
        this.numDigits = 0;
        this.damping = 0.7;
        this.colorsCollected = [];
        this.colorPowerUsage = [];
        this.lastColorCollected = null;
        this.roundsMax = 6;
        this.roundsLoaded = 6;
        this.reloadTime = 2.0;
        this.reloading = false;

        this.hitSound = new Sound([1.6,,418,.01,.08,.09,4,2.2,1,,,,,1.8,,.1,.05,.53,.08,,149]); // Hit 2
        this.powerUpSound = new Sound([,,531,.07,.29,.2,,3.7,,200,206,.14,.03,,,.1,,.53,.25,.18]); // Powerup 21
        this.reloadingSound = new Sound([,,225,.06,.26,.06,1,.7,,3,-85,.14,,,,,,.53,.14]); // Powerup 150
        this.reloadedSound = new Sound([1.6,,103,.01,.03,.03,,2.6,,,-366,,,,3,,.01,.82,.01,.19]); // Blip 147

        this.healthMax = 5;
        this.health = 5;
        this.damage = 1;
        this.damageTimer = new Timer;
        this.speed = 0.1;

        this.lastTouchedBox = null;
        this.powerUpTime = 1.0;
        this.powerUpTimer = new Timer;

        this.aimDir = vec2(0)
        this.lastDirection = vec2(0);
        this.cameraMove = 0;
        this.cameraMoveMax = 30;
        this.cameraMoveSpeed = .05;

        this.playerColor = BLACK;

        this.currentAlterCamDistance = 7.5;

        this.radiansToRotate = 30 * Math.PI / 180;
        console.log(this.radiansToRotate);
        this.newX = 0.0;
        this.newY = 0.0;
    }

    collectColor(color) {
        this.colorsCollected.push(color);
        this.colorPowerUsage.push(0);
        this.lastColorCollected = color;
    }

    takeDamage(damage) {
        this.health -= damage;
        this.damageTimer.set();

        this.hitSound.play();

        if(this.health < 1) {
            this.destroy();
            player = null;
            stop_music();
            gameEnded = true;
            lose = true;
            play_music("lose");
        } 
    }

    doDamage(damage, object) {
        object.takeDamage(damage);
    }

    update()
    {   
        super.update();

        if(isUsingGamepad) {
            this.aimDir = gamepadStick(1);
        } else {
            this.aimDir = mousePos.subtract(this.pos).clampLength(3);
        }

        //engineObjectsRaycast(this.pos, mousePos.subtract(this.pos).rotate(-30));
        

        /*engineObjectsRaycast(this.pos, mousePos);

        this.newX = this.pos.x + (this.pos.distance(mousePos) * Math.cos(this.radiansToRotate));
        this.newY = this.pos.y + (this.pos.distance(mousePos) * Math.sin(this.radiansToRotate));
        console.log("new point: " + vec2(this.newX, this.newY));
        console.log("new screen points: ")
        //console.log("new y: " + this.newY);
        engineObjectsRaycast(this.pos, vec2(this.newX, this.newY));*/
        
        /*radiansToRotate = (10*Math.PI)/180;
        newX = this.pos.x + this.pos.distance(mousePos) * Math.cos(radiansToRotate);
        newY = this.pos.y + this.pos.distance(mousePos) * Math.sin(radiansToRotate);
        engineObjectsRaycast(this.pos, vec2(newX, newY));*/

        touchGamepadEnable = true;

        // apply movement controls
        if(gameStarted && !gameEnded) {
            if(isUsingGamepad) {
                this.velocity = this.velocity.add(gamepadStick(0).clampLength(1).scale(this.speed));
            } else {
                this.velocity = this.velocity.add(keyDirection().clampLength(1).scale(this.speed));
            }

            this.lastDirection = this.velocity;
            
            if ((mouseWasPressed(0) || gamepadWasPressed(7)) && !this.reloading) {
                this.shoot();
            }

            if ((mouseWasPressed(2) || gamepadWasPressed(5) || keyWasPressed('KeyR')) && !this.reloading) {
                this.startReload();
            }

            if ((gamepadWasPressed(6) || keyWasPressed('KeyQ'))) {
                this.powerUpTimer.set(this.powerUpTime);
            }

            if ((gamepadWasReleased(6) || keyWasReleased('KeyQ'))) {
                this.powerUpTimer.unset();
            }

            if(this.lastTouchedBox) {
                let dist = (abs(this.pos.distance(this.lastTouchedBox.pos)) - 1 - ((this.lastTouchedBox.size.x+this.lastTouchedBox.size.y)/2)/2);

                if(this.lastTouchedBox.boxColor != BLACK && dist < 1) {
                    if(!this.powerUpTimer.isSet()) {
                        this.powerUpTimer.set(this.powerUpTime);
                    } else {
                        this.lastTouchedBox.color = rgb(this.lastTouchedBox.color.r, this.lastTouchedBox.color.g, this.lastTouchedBox.color.b, this.lastTouchedBox.color.a-0.02)
                    }
                }

                if(this.lastTouchedBox.boxColor != BLACK && dist > 1) {
                    this.powerUpTimer.unset();
                    this.lastTouchedBox = null;
                }
            }

            if (this.powerUpTimer.elapsed()) {
                this.powerUpTimer.unset();
                this.usePower();
            }
        }

        let alterCamDir = vec2(0,0);
        
        // smoothly follow player with lerp
        if(this.lastDirection.y > 0.0) {
            this.currentAlterCamDistance += 0.1;
            if(this.currentAlterCamDistance > 6.5) {
                this.currentAlterCamDistance = 6.5;
            }
            alterCamDir = vec2(0, this.currentAlterCamDistance);
        }
        if(this.lastDirection.y < 0.0) {
            this.currentAlterCamDistance -= 0.1;
            if(this.currentAlterCamDistance < -6.5) {
                this.currentAlterCamDistance = -6.5;
            }
            alterCamDir = vec2(0, this.currentAlterCamDistance);
        }

        /*console.log("lasdir: " + this.lastDirection);
        if(this.lastDirection.y > 0.0) {
            this.cameraMove += this.cameraMoveSpeed;
        }
        if(this.lastDirection.y < 0.0) {
            this.cameraMove -= this.cameraMoveSpeed;
        }
        console.log("cam move: " + this.cameraMove);
        if(this.cameraMove > this.cameraMoveMax) {
            this.cameraMove = this.cameraMoveMax;
        }
        if(this.cameraMove < -this.cameraMoveMax) {
            this.cameraMove = -this.cameraMoveMax;
        }
        console.log("cam move: " + this.cameraMove);*/

        cameraPos = cameraPos.lerp(this.pos.add(vec2(0, this.currentAlterCamDistance)).add(this.aimDir), .2);


        // only let the camera scroll up
        // no going back
        //if (lastCameraPos.y <= this.pos.y) {
        //cameraPos.y = cameraPos.lerp(this.pos, .1).y;
        //}

        
    }

    shoot() {
        // check if we have a round to shoot or not
        if (this.roundsLoaded > 0) {
            // calculate trajectory
            let tra = vec2(0);

            if(isUsingGamepad) {
                tra = gamepadStick(1);
            } else {
                tra = mousePos.subtract(this.pos).normalize();
            }
            // shoot bullet
            new PlayerBullet(this.pos, tra);
            this.roundsLoaded -= 1;

            if(this.roundsLoaded == 0) {
                this.startReload();
            }
        } else {
            this.startReload();
        }
        
    }

    startReload() {
        if(!this.reloading) {
            this.reloading = true;
            this.reloadingSound.play();
            setTimeout(() => { this.reload(); }, this.reloadTime*1000);
        }
    }

    reload() {
        // reload rounds into gun
        this.roundsLoaded = this.roundsMax;
        this.reloadedSound.play();
        this.reloading = false;
    }

    render() {
        if(this.reloading) {
            this.playerColor = RED;
        } else {
            this.playerColor = BLACK;
        }

        let bright = 0;
        if (this.damageTimer.isSet()) {
            bright = .8*percent(this.damageTimer, .15, 0);
        }
        
        this.color = rgb(this.playerColor.r+bright, this.playerColor.g+bright, this.playerColor.b+bright, this.playerColor.a);

        super.render();
    }

    destroy() {
        if (this.health < 1) {
            super.destroy();
            return true;
        } else {
            return false;
        }
    }

    usePower() {
        if(this.lastTouchedBox) {
            let dist = (abs(this.pos.distance(this.lastTouchedBox.pos)) - 1 - ((this.lastTouchedBox.size.x+this.lastTouchedBox.size.y)/2)/2);

            if(this.lastTouchedBox.boxColor != BLACK && dist < 1) {
                let colorUsage = this.checkColorUsage(this.lastTouchedBox.boxColor);
                if(colorUsage > -1) {
                    this.powerUpSound.play();

                    if (this.lastTouchedBox.boxColor == GREEN) {
                        this.health += 1;
                    }

                    useColorPower(colorUsage);
                }
                
                //this.lastTouchedBox.color = BLACK;
                this.lastTouchedBox.destroy();
                this.lastTouchedBox = null;
            }
        }
    }

    checkColorUsage(color) {
        for(let i=0;i<this.colorsCollected.length;i++) {
            if(this.colorsCollected[i].r == color.r && this.colorsCollected[i].g == color.g && this.colorsCollected[i].b == color.b) {
                if(this.colorPowerUsage[i] > 0) {
                    return i;
                }
            }
        }

        return -1;
    }

    collideWithObject(object) {
        if(object instanceof Box) {
            this.lastTouchedBox = object;
        }

        return true;
    }
}

class Bullet extends EngineObject {
    constructor(pos, velocity)
    {
        super(pos, vec2(.2), 0, 0, BLACK);
        this.setCollision(); // make object collide
        this.renderOrder = 2;
        this.damping = 0.98;
        this.velocity = velocity;

        //this.shootSound = new Sound([.7,,120,.02,.07,.06,,3.5,17,-9,,,,,,,,.59,.08,,99]); // Shoot 9
        this.shootSound = new Sound([1.4,,533,.02,.08,.22,,3.6,-5,,219,.07,,,,,,.77,.01,,413]); // Pickup 141
        this.wallHitSound = new Sound([1.1,,44,.01,.02,.09,4,2.4,-0.5,,,,,1.1,8.5,.4,,.6,.02]); // Hit 39 - Copy 5
        this.boxHitSound = new Sound([.4,,124,.01,.04,.04,5,1.1,-8,,,,,.8,,.1,,.98,.08,,638]); // Hit 45
        this.speed = 1;
        this.damage = 1;
        this.dTimer = new Timer(1);

        this.shootSound.play();

        bullets.push(this);

        console.log("new bullet size: " + bullets.length);
    }

    update() {
        super.update();

        if(this.dTimer.elapsed()) {
            this.destroy();
        }
    }

    destroy() {
        bullets.pop(this);

        console.log("last bullet size: " + bullets.length);

        super.destroy();
    }
}

class PlayerBullet extends Bullet 
{
    constructor(pos, velocity) {
        super(pos, vec2(.2), 0, 0, BLACK);
        this.velocity = velocity;

        if(bouncingBullets) {
            this.restitution = 1;
        }
    }

    collideWithObject(object) {
        if (object instanceof Player) {
            return false;
        }

        if (object instanceof Enemy) {
            object.takeDamage(this.damage);
            this.destroy();
        }

        if (object instanceof PhysicsObject) {
            this.wallHitSound.play();
            this.destroy();
        }

        if (object instanceof Box) {
            if(!bouncingBullets) {
                this.boxHitSound.play();
                object.takeDamage(this.damage);
                this.destroy();
            } else {
                return true;
            }
            
        }
    }
}

class EnemyBullet extends Bullet 
{
    collideWithObject(object) {
        if (object instanceof Enemy) {
            return false;
        }

        if (object instanceof Player) {
            object.takeDamage(this.damage);
            this.destroy();
        }

        if (object instanceof PhysicsObject) {
            this.wallHitSound.play();
            this.destroy();
        }

        if (object instanceof Box) {
            this.boxHitSound.play();
            object.takeDamage(this.damage);
            this.destroy();
        }
    }
}

class Enemy extends EngineObject
{
    constructor(pos, size, color, health=1, damage=1, speed=0.1, patrolDistance=30, shootRange=10, shootRate=2.0)
    {
        super(pos, size, null, 0, color); // set object position and size
        this.setCollision(); // make object collide
        this.mass = 1;
        this.damping = 0.5;

        this.hitSound = new Sound([2.1,,131,.02,.04,.17,1,.6,,,,,,.8,.5,.3,.07,.46,.07]); // Hit 0
        this.dieSound = new Sound([2.1,,372,.02,.02,.18,1,3.2,,,,,,.9,,.2,.14,.61,.1]); // Hit 6
        this.health = health;
        this.damage = damage;
        this.damageTimer = new Timer;
        this.speed = speed;
        this.homePos = pos;
        this.patrolDistance = patrolDistance;
        this.rdir = null;
        this.state = "patrolout";

        this.shootRange = shootRange;
        this.shooting = false;
        this.shootRate = shootRate;

        this.enemyColor = color;
    }

    update() {
        super.update();

        // aim assist when bullets are close and angle isn't too high
        /*for(let i=0;i<bullets.length;i++) {
            if(this.pos.distance(bullets[i].pos) < 5) {
                //console.log("angle: " + (180 - (Math.acos(this.pos.dot(bullets[i].velocity.abs())/(this.pos.length()*bullets[i].velocity.length()))) * (180/Math.PI)) );
                let dirVec = bullets[i].pos.subtract(this.pos)
                console.log("angle: " + Math.atan2(dirVec.y, dirVec.x) * (180/Math.PI));
            }
        }*/

        let bright = 0;
        if (this.damageTimer.isSet()) {
            bright = .5*percent(this.damageTimer, .15, 0);
        }
        
        this.color = rgb(this.enemyColor.r+bright, this.enemyColor.g+bright, this.enemyColor.b+bright, this.enemyColor.a);
    }

    patrol() {
        let hits = [];
        if (this.state == "patrolout") {
            while(this.rdir == null) {
                // get random direction of length patrolDistance
                this.rdir = randVec2(this.patrolDistance);
                //hits = engineObjectsRaycast(this.pos, this.pos.add(this.rdir));
            }
        
            this.velocity = this.rdir.clampLength(1).scale(this.speed);

            if(abs(this.homePos.distance(this.pos)) > this.patrolDistance) {
                this.state == "comehome";
                this.rdir = null;
            }
        }

        if (this.state == "comehome") {
            this.velocity = this.velocity.add(this.pos.subtract(this.homePos).clampLength(1).scale(this.speed));

            if(abs(this.homePos.distance(this.pos)) < 0.1) {
                this.state == "patrolout";
            }
        }
    }

    scanToShoot() {
        if(player != null && abs(this.pos.distance(player.pos)) < this.shootRange && !this.shooting) {
            this.shoot();
        }
    }

    shoot() {
        if(!this.shooting) {
            this.shooting = true;
            new EnemyBullet(this.pos, player.pos.subtract(this.pos).normalize().scale(.5));

            setTimeout(() => { this.shooting = false; }, this.shootRate*1000);
        }
    }

    takeDamage(damage) {
        this.health -= damage;
        this.damageTimer.set();

        if(this.health < 1) {
            //this.dieSound.play();
            play_sound("enemy_die");
            this.destroy();
        } else {
            this.hitSound.play();
        }        
    }

    doDamage(damage, object) {
        object.takeDamage(damage);
    }
}

class Roamer extends Enemy 
{
    constructor(pos, size, color) {
        super(pos, size, color, 3);
        this.setCollision();
    }

    update() {
        super.patrol();

        this.scanToShoot();

        super.update();
    }

    collideWithObject(object) {
        if (object instanceof Player) {
            super.takeDamage(1);
        }

        this.rdir = null;
        return true;
    }
}

class Seeker extends Enemy 
{
    constructor(pos, size, color) {
        super(pos, size, color, 3);
        this.setCollision();

        this.seekDistance = 40;
        this.seekAngle = 30;
    }

    update() {
        super.patrol();

        super.update();
    }

    collideWithObject(object) {
        if (object instanceof Player) {
            super.takeDamage(1);
        }

        this.rdir = null;
        return true;
    }
}

class Charger extends Enemy 
{
    constructor(pos, size, color) {
        super(pos, size, color, 3);
        this.setCollision();
    }

    update() {
        super.patrol();

        this.scanToShoot();

        super.update();
    }

    collideWithObject(object) {
        if (object instanceof Player) {
            super.takeDamage(1);
        }

        this.rdir = null;
        return true;
    }
}

class TurtTurt extends Enemy 
{
    constructor(pos, size, color) {
        super(pos, size, color, 10, 3, 0.05);
        this.setCollision();

        this.dmgTimer = new Timer(.5);
        this.damageTime = 2.0;
    }

    update() {
        super.patrol();

        super.update();
    }

    collideWithObject(object) {
        if (object instanceof Player && this.dmgTimer.elapsed()) {
            object.takeDamage(this.damage);
            this.dmgTimer.set(this.damageTime);
        }

        if (object instanceof PhysicsObject) {
            this.rdir = vec2(-this.rdir.x, -this.rdir.y);
        }

        if (object instanceof Box) {
            this.rdir = vec2(-this.rdir.x, -this.rdir.y);
        }

        return true;
    }
}

class Floor extends EngineObject
{
    constructor(pos, size, color)
    {
        super(pos, size, null, 0, color); // set object position and size
    }
}

class PhysicsObject extends EngineObject
{
    constructor(pos, size)
    {
        super(pos, size, null, 0, BLACK); // set object position and size
        this.setCollision(); // make object collide
        this.mass = 0; // make object have static physics
    }
}

class Box extends EngineObject
{
    constructor(pos, size, what, when, color)
    {
        super(pos, size, what, when, color); // set object position and size
        this.setCollision(); // make object collide
        this.mass = 0; // make object have static physics

        this.bawksExplodeSound = new Sound([1.1,,34,.02,.29,.39,,2.1,-6,,350,,,.8,,.9,,.42]); // Explosion 150

        this.boxColor = color;
        this.healthMax = Math.ceil((size.x + size.y)/2) + 1;
        this.health = this.healthMax;
    }

    takeDamage(damage) {
        this.health -= damage;

        if(this.health < 1) {
            this.bawksExplodeSound.play();
            this.destroy();
        } else {
            this.color = rgb(this.color.r, this.color.g, this.color.b, this.health/this.healthMax);
        }

    }
}

class Portal extends EngineObject {
    constructor(pos, color)
    {
        super(pos, vec2(3), null, 0, color);
        this.setCollision(); // make object collide
        this.renderOrder = 2;

        //this.portalSound = new Sound([1.9,,594,.04,.5,.06,1,3.2,,2,,,,,,,,.74,.27,,663]); // Powerup 16
        this.portalSound = new Sound([2.8,,113,.35,.38,.001,,3.4,,,-483,.02,.04,,1,,.17,.68,.05,.03,-1045]); // Random 216 - Mutation 6
    }

    collideWithObject(object) {
        if (object instanceof Player) {
            this.portalSound.play();

            // check for end game and win
            if(player.colorsCollected.length == 7) {
                gameEnded = true;
                win = true;
            }

            // reset game
            engineObjectsDestroy();
            loadLevel();
        }
    }

    render() {
        drawRect(this.pos, vec2(this.size.x+oscillate(.5), this.size.y+oscillate(.5)), this.color);
    }
}

class RainbowColor extends EngineObject {
    constructor(pos)
    {
        let rainbowColors = [RED, ORANGE, YELLOW, GREEN, BLUE, rgb(0.29, 0, 0.51), rgb(0.93, 0.51, 0.93)];
        let playerCollectedColors = player.colorsCollected;
        let remainingColors = rainbowColors.filter(item => !playerCollectedColors.some(removeItem => item.r === removeItem.r && item.g === removeItem.g && item.b === removeItem.b));
        let pick = remainingColors[randInt(0,remainingColors.length)];

        super(pos, vec2(3), null, 0, pick);
        this.setCollision(); // make object collide
        this.renderOrder = 2;
        this.colorValue = pick;

        //this.pickupSound = new Sound([2.5,.5,420,.02,.19,.27,1,1.3,3,-3,-100,.07,,.3,,,,.78,.21,,949]); // Powerup 12
    }

    collideWithObject(object) {
        if (object instanceof Player) {
            object.collectColor(this.colorValue);
            play_sound("color_collect");
            this.destroy();
        }   
    }
}

function loadLevel() {
    play_music("track1");

    if(player.lastColorCollected) {
        levelTint = player.lastColorCollected;
    }

    player.roundsLoaded = player.roundsMax;
    player.reloading = false;

    // create walls
    // setup level
    const levelSize = vec2(38, 500);    // size of play area
    cameraPos = levelSize.scale(.5);   // center camera in level
    canvasFixedSize = vec2(1280, 720); // use a 720p fixed size canvas

    // create objects
    //paddle = new PhysicsObject(vec2(0,1), vec2(6,1)); // player

    const w = levelSize.x, h = levelSize.y;
    new Floor(vec2(w/2, 249.5), vec2(w, 500), rgb(1,1,1,1)); // floor
    new PhysicsObject(vec2(0-.5, 249.5),  vec2(1, 500)); // left wall
    new PhysicsObject(vec2(w+.5, 249.5), vec2(1, 500)); // right wall
    new PhysicsObject(vec2(w/2, 0), vec2(38, 1)); // bottom wall
    new PhysicsObject(vec2(w/2, 499), vec2(38, 1)); // top wall


    // create collision objects
    for (let i=200; i--;)
    {
        let size = vec2(0);
        let pos = vec2(0);
        let spawnRedo = true;

        do 
        {
            spawnRedo = false;
            size = vec2(rand(1,6),rand(1,6));
            pos = vec2(randInt(0+(size.x/2), levelSize.x-(size.x/2)), randInt(0+(size.y/2)+6, levelSize.y-(size.y/2)-6));

            for(let j=0; j < engineObjects.length; j++) {
                if(isOverlapping(pos, size, engineObjects[j].pos, engineObjects[j].size) && engineObjects[j].collideSolidObjects) {
                    spawnRedo = true;
                }
            }
        } while (spawnRedo)
        //const size = vec2(rand(1,6),rand(1,6));
        //const pos = vec2(randInt(0+(size.x), levelSize.x-(size.x)), randInt(0+(size.y)+6, levelSize.y-(size.y)-6));

        //let color = hsl(.1,.5,rand(.2));
        let color = BLACK;
        let collectedLength = player.colorsCollected.length
        if (collectedLength > 0) {
            if(rand() < collectedLength/7 ) {
                color = player.colorsCollected[randInt(0, collectedLength)];
            }
        }

        const o = new Box(pos, size, 0, 0, color);
        o.setCollision(); // make object collide
        o.mass = 0; // make object have static physics
    }

    // create random rainbow color to collect
    if (player.colorsCollected.length < 7) {
        let rainbowColors = [RED, ORANGE, YELLOW, GREEN, BLUE, rgb(0.29, 0, 0.51), rgb(0.93, 0.51, 0.93)];
        let playerCollectedColors = player.colorsCollected;
        let remainingColors = rainbowColors.filter(item => !playerCollectedColors.some(removeItem => item.r === removeItem.r && item.g === removeItem.g && item.b === removeItem.b && item.a === removeItem.a));

        if (remainingColors.length > 0) {
            let size = vec2(0);
            let pos = vec2(0);
            let spawnRedo = true;

            do 
            {
                spawnRedo = false;
                size = vec2(3);
                pos = vec2(randInt(6, levelSize.x-6), randInt(25, 49));

                for(let j=0; j < engineObjects.length; j++) {
                    if(isOverlapping(pos, size, engineObjects[j].pos, engineObjects[j].size) && engineObjects[j].collideSolidObjects) {
                        spawnRedo = true;
                    }
                }
            } while (spawnRedo)

            new RainbowColor(pos);
        }
    }

    // create portal to end level
    if (player.lastColorCollected == null) {
        new Portal(vec2(19, 495), GRAY);
    } else {
        new Portal(vec2(19, 495), GRAY);
    }
    

    player.pos = vec2(19, 3);

    cameraPos = player.pos.add(vec2(0,-5));

    // create enemies
    for (let i=20; i--;)
    {
        let size = vec2(0);
        let pos = vec2(0);
        let spawnRedo = true;
        let r = rand();

        do 
        {
            spawnRedo = false;

            if (r > .2) {
                size = vec2(1);
            } else {
                size = vec2(3);
            }

            pos = vec2(randInt(0+(size.x), levelSize.x-(size.x)), randInt(30, levelSize.y-(size.y)-6));

            for(let j=0; j < engineObjects.length; j++) {
                if(isOverlapping(pos, size, engineObjects[j].pos, engineObjects[j].size) && engineObjects[j].collideSolidObjects) {
                    spawnRedo = true;
                }
            }
        } while (spawnRedo)
        
        if (r > .2) {
            new Roamer(pos, size, MAGENTA);
        } else {
            new TurtTurt(pos, size, rgb(0, .5, 0));
        }
        
    }

    loadColorPowerUsage();

    
}

function useColorPower(colorNumber) {
    player.colorPowerUsage[colorNumber] -= 1;
}

function loadColorPowerUsage() {
    for(let i=0;i<player.colorsCollected.length;i++) {
        player.colorPowerUsage[i] = randInt(0, 3);
    }
}

function gameInit() {}

function gameUpdate() {
    if(!paused) {
        if(!intro && !gameStarted) {
            if(keyWasPressed('Space') || gamepadWasPressed(0) || mouseWasPressed(0)) {
                inputClear();
                gameStarted = true;
                player = new Player(vec2(19, 3));
                loadLevel();
            }
        }

        if(intro) {
            if(keyWasPressed('Space') || gamepadWasPressed(0) || mouseWasPressed(0)) {
                inputClear();
                intro = false;
                //play_music("title");
            }
        }

        if(gameEnded) {
            if(keyWasPressed('Space') || gamepadWasPressed(0) || mouseWasPressed(0)) {
                inputClear();
                gameEnded = false;
                win = false;
                lose = false;
                player = new Player(vec2(19, 3));
                engineObjectsDestroy();
                loadLevel();
            }
        }

        if(gameStarted && !gameEnded) {
            if ((keyWasPressed('KeyL') || gamepadWasPressed(1)) && gameStarted) {
                engineObjectsDestroy();
                loadLevel();
            }

            if ((keyWasPressed('KeyB'))) {
                bouncingBullets = !bouncingBullets;
            }
        }

        if (keyWasPressed('KeyM')) {
            toggle_music();
        }
    }

}
function gameUpdatePost() {
    if(gameStarted && !gameEnded) {
        if((keyWasPressed('KeyP') || gamepadWasPressed(9)) && gameStarted) {
            paused = !paused;
            toggle_music();
        }
    }
}
function gameRender() {
    
}
function gameRenderPost() {
    if(paused) {
        // paused so draw not much
        drawRect(cameraPos, canvasFixedSize, rgb(0,0,0,0.6));
        drawTextScreen('PAUSED', mainCanvasSize.scale(.5), 80);
    } else {
        if(intro && !gameStarted) {
            drawRect(vec2(0,0), vec2(100, 100), BLACK);
            drawTextScreen('A presentation by Raptor and Noah Zark\nLeft click, press bottom face button, or press Space to start!', mainCanvasSize.scale(.5), 40);
        }

        if(!intro && !gameStarted) {
            drawRect(vec2(0,0), vec2(100, 100), BLACK);
            drawTextScreen('Presenting...\n\nRoy G. Biv\n\n\nLeft click, press bottom face button, or press Space to start!', mainCanvasSize.scale(.5), 40);
        }

        if(gameStarted && gameEnded) {
            if(win) {
                drawRect(cameraPos, vec2(100, 100), BLACK);
                drawTextScreen('You win! You unicorn you!\n\n\nLeft click, press bottom face button, or press Space to restart!', mainCanvasSize.scale(.5), 40);
            }

            if(lose) {
                drawRect(cameraPos, vec2(100, 100), BLACK);
                drawTextScreen('You lose! Bad unicorn!\n\n\nLeft click, press bottom face button, or press Space to restart!', mainCanvasSize.scale(.5), 40);
            }
        }

        if(gameStarted && !gameEnded) {
            drawTextScreen('Health: ' + player.health + '/' + player.healthMax, vec2(87, 20), 25, GREEN);
            drawTextScreen('Bullets Loaded: ' + player.roundsLoaded + '/' + player.roundsMax, vec2(133, 50), 25, RED);

            if(player.colorsCollected.length > 0) {
                drawRect(vec2(130, 90), vec2(225, 30), WHITE, 0, true, true);
            }
            
            let startX = 45;
            for(let i=0;i<player.colorsCollected.length;i++) {
                drawRect(vec2(startX, 90), vec2(25), player.colorsCollected[i], 0, true, true);
                let usage = player.colorPowerUsage[i];
                let usageColor = BLACK;
                if(usage == 0) {
                    usageColor = RED;
                }
                drawTextScreen(usage, vec2(startX, 90), 15, usageColor);
                startX += 32;
            }
        }
    }
}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);