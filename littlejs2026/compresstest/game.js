/*
    LittleJS JS13K Starter Game
    - For size limited projects
    - Includes all core engine features
    - Builds to 7kb zip file
*/

setShowWatermark(false);
const lowResSize = 256;
setCanvasPixelated(true);
glSetAntialias(true);

let spriteAtlas;
let intro = false;
let gameStarted = false;
let gameEnded = false;
let win = false;
let lose = false;
let levelTint = rgb(1,1,1,1);
let vertScrollSpeed = .1;
let player;
let bouncingBullets = false;
let enemies = [];
let bullets = [];
let boxes = [];
let randomColorLeft = null;
let aimToggle = true;

const INDIGO = rgb(0.29, 0, 0.51);
const VIOLET = rgb(0.93, 0.51, 0.93);

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
        super(pos, vec2(1.5, .5), null, 0, WHITE);
        this.setCollision(); // make object collide
        this.renderOrder = 1; // render player on top
        this.numDigits = 0;
        this.damping = 0.7;
        this.colorsCollected = [];
        this.colorPowerUsage = [];
        this.lastColorCollected = null;
        this.roundsMax = 6;
        this.roundsLoaded = 6;
        this.shootTimer = new Timer;
        this.shootTime = .5;
        this.reloadTime = 2.0;
        this.reloading = false;

        this.hitSound = new Sound([1.6,,418,.01,.08,.09,4,2.2,1,,,,,1.8,,.1,.05,.53,.08,,149]); // Hit 2
        this.colorDrainSound = new Sound([,,531,.07,.29,.2,,3.7,,200,206,.14,.03,,,.1,,.53,.25,.18]); // Powerup 21
        this.powerUpSound = new Sound([,,474,.08,.24,.28,,0,5,,163,.08,,,,,,.68,.26]); // Powerup 42
        this.reloadingSound = new Sound([,,225,.06,.26,.06,1,.7,,3,-85,.14,,,,,,.53,.14]); // Powerup 150
        this.reloadedSound = new Sound([1.6,,103,.01,.03,.03,,2.6,,,-366,,,,3,,.01,.82,.01,.19]); // Blip 147

        this.healthMax = 5;
        this.health = 5;
        this.damage = 1;
        this.damageTimer = new Timer;
        this.speed = .06;

        this.lastTouchedBox = null;
        this.powerUpTime = 1.0;
        this.powerUpTimer = new Timer;
        this.orangeTimer = new Timer;
        this.redTimer = new Timer;
        this.yellowTimer = new Timer;
        this.blueTimer = new Timer;
        this.chargeShot = false;
        this.indigoTimer = new Timer;
        this.violetTimer = new Timer;

        this.aimDir = vec2(0);
        this.hits = [];
        this.lastDirection = vec2(0);
        this.cameraMove = 0;
        this.cameraMoveMax = 30;
        this.cameraMoveSpeed = .05;

        this.frameTime = 0.2;
        this.frameTimer = new Timer(this.frameTime);
        this.currentFrame = 0;
        this.frameOffset = 0;
        this.maxFrames = 0;

        this.playerColorDefault = WHITE;
        this.playerColor = WHITE;

        this.currentAlterCamDistance = 7.5;

        this.newX = 0.0;
        this.newY = 0.0;

        this.tileInfo = spriteAtlas.player.frame(0);
        this.drawSize = vec2(2);
        this.drawOffset = vec2(0,1);
    }

    collectColor(color) {
        this.colorsCollected.push(color);
        this.colorPowerUsage.push(0);
        this.lastColorCollected = color;
    }

    collectPower(col) {
        for(let i=0;i<this.colorsCollected.length;i++) {
            if(col.r == this.colorsCollected[i].r && col.g == this.colorsCollected[i].g && col.b == this.colorsCollected[i].b) {
                this.colorPowerUsage[i] += 1;
            }
        }

        this.colorDrainSound.play();
        this.lastTouchedBox.destroy();
        this.lastTouchedBox = null;
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

    usePower(col) {
        let colorUsage = this.checkColorUsage(col);
        if(colorUsage > -1) {
            this.powerUpSound.play();

            if(col == GREEN) {
                this.health += 1;
            }
            if(col == ORANGE) {
                this.orangeTimer.set(1);
                this.playerColor = ORANGE;
                new Shield(player.pos.add(vec2(0,2)));
            }
            if(col == RED) {
                this.redTimer.set(5);
                this.playerColor = RED;
            }
            if(col == YELLOW) {
                this.yellowTimer.set(10);
                this.playerColor = YELLOW;
            }
            if(col == BLUE) {
                this.blueTimer.set(3);
                this.chargeShot = false;
                this.playerColor = BLUE;
            }
            if(col == INDIGO) {
                this.indigoTimer.set(5);
                this.playerColor = INDIGO;
            }
            if(col == VIOLET) {
                this.violetTimer.set(2.5);
                this.playerColor = VIOLET;
            }

            this.useColorPower(colorUsage);
        }
    }

    useColorPower(colorNumber) {
        player.colorPowerUsage[colorNumber] -= 1;
    }

    takeDamage(damage) {
        if(!this.yellowTimer.isSet()) {
            this.health -= damage;
            this.damageTimer.set();
        }
        
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
            document.body.style.cursor = 'none';
            aimToggle = true;
            this.aimDir = gamepadStick(1);
        } else {
            this.aimDir = mousePos.subtract(this.pos).clampLength(3);
            aimToggle = false;
            document.body.style.cursor = 'crosshair';
        }

        touchGamepadEnable = true;

        // apply movement controls
        if(gameStarted && !gameEnded) {
            let inputDir = vec2();
            if(isUsingGamepad) {
                inputDir = gamepadStick(0);
            } else {
                inputDir = keyDirection();
            }

            this.velocity = this.velocity.add(inputDir.clampLength(1).scale(this.speed));

            this.lastDirection = inputDir;
            
            if ((mouseWasPressed(0) || gamepadWasPressed(7)) && !this.reloading) {
                this.shoot();
            }

            if ((mouseWasPressed(2) || gamepadWasPressed(5) || keyWasPressed('KeyR')) && !this.reloading) {
                this.startReload();
            }

            for(let i=0;i<7;i++) {
                if(keyWasPressed("Digit"+(i+1)))
                    this.usePower(this.colorsCollected[i]);
            }

            if(keyWasPressed('KeyE') || gamepadWasPressed(2)) {
                this.usePower(ORANGE);
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

            if (this.shootTimer.elapsed()) {
                this.shootTimer.unset();
            }

            if (this.powerUpTimer.elapsed()) {
                this.powerUpTimer.unset();
                this.collectPower(this.lastTouchedBox.boxColor);
            }

            if(this.orangeTimer.elapsed()) {
                this.orangeTimer.unset();
                this.playerColor = this.playerColorDefault;
            }

            if(this.redTimer.elapsed()) {
                this.redTimer.unset();
                this.playerColor = this.playerColorDefault;
            }

            if(this.yellowTimer.elapsed()) {
                this.yellowTimer.unset();
                this.playerColor = this.playerColorDefault;
            }

            if(this.blueTimer.elapsed()) {
                this.blueTimer.unset();
                player.chargeShot = true;
                this.playerColor = this.playerColorDefault;
            }

            if(this.indigoTimer.elapsed()) {
                this.indigoTimer.unset();
                this.playerColor = this.playerColorDefault;
            }

            if(this.violetTimer.elapsed()) {
                this.violetTimer.unset();
                this.playerColor = this.playerColorDefault;
            }
        }

        let alterCamDir = vec2(0,0);
        
        // smoothly follow player with lerp
        if(this.lastDirection.y > 0.0) {
            this.currentAlterCamDistance += .1;
            if(this.currentAlterCamDistance > 6.5) {
                this.currentAlterCamDistance = 6.5;
            }
            alterCamDir = vec2(0, this.currentAlterCamDistance);
        }
        if(this.lastDirection.y < 0.0) {
            this.currentAlterCamDistance -= .1;
            if(this.currentAlterCamDistance < -6.5) {
                this.currentAlterCamDistance = -6.5;
            }
            alterCamDir = vec2(0, this.currentAlterCamDistance);
        }

        cameraPos = cameraPos.lerp(this.pos.add(vec2(0, this.currentAlterCamDistance)).add(this.aimDir), .2);
    }

    shoot() {
        // check if we have a round to shoot or not
        if (this.roundsLoaded > 0) {
            if (!this.shootTimer.isSet() && !this.orangeTimer.isSet()) {
                // calculate trajectory
                let tra = vec2(0);

                if(isUsingGamepad) {
                    tra = gamepadStick(1);
                } else {
                    tra = mousePos.subtract(this.pos).normalize();
                }

                if(this.hits != null && this.hits > 0) {
                    tra = this.hits[0].pos.subtract(this.pos).normalize();
                }

                // shoot bullet
                let bulletColor = BLACK;
                if(this.redTimer.isSet()) {
                    bulletColor = RED;

                    for(let i=0;i<4;i++) {
                        new PlayerBullet(this.pos, tra.add(vec2(rand(), rand())), bulletColor);
                    }
                }
                if(this.chargeShot) {
                    bulletColor = BLUE;
                }
                new PlayerBullet(this.pos, tra, bulletColor);
                this.chargeShot = false;
                this.roundsLoaded -= 1;

                if(this.roundsLoaded == 0) {
                    this.startReload();
                }

                this.shootTimer.set(this.shootTime);
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
            this.playerColor = RED;
        }
    }

    reload() {
        // reload rounds into gun
        this.roundsLoaded = this.roundsMax;
        this.reloadedSound.play();
        this.reloading = false;
        this.playerColor = this.playerColorDefault;
    }

    render() {
        let bright = 0;
        if (this.damageTimer.isSet()) {
            bright = .8*percent(this.damageTimer, .15, 0);
        }
        
        this.color = rgb(this.playerColor.r+bright, this.playerColor.g+bright, this.playerColor.b+bright, this.playerColor.a);

        // draw shadow
        drawTile(vec2(this.pos.x, this.pos.y-0.4).add(this.drawOffset), vec2(1.9), spriteAtlas.shadow, rgb(1,1,1,0.3), this.angle, this.mirror);
        
        if(this.velocity.x < 0) {
            this.mirror = true;        
        } 
        if(this.velocity.x > 0) {
            this.mirror = false;
        }

        // figure out what animation and then draw the frame
        if(this.velocity.length() > 0.01) {
            if(this.frameTimer.elapsed()) {
            // increment frame
                if(this.currentFrame == 0) {
                    this.currentFrame = 1;
                } else if(this.currentFrame == 1) {
                    this.currentFrame = 0;
                }

                this.frameTimer = new Timer(this.frameTime);
            }

            this.tileInfo = spriteAtlas.player.frame(this.currentFrame);
        }

        drawTile(this.pos.add(this.drawOffset), this.drawSize, this.tileInfo, this.color, this.angle, this.mirror, this.additiveColor);

        //drawTile(this.pos.add(this.aimDir.normalize().scale(5)).rotate(-15), vec2(.3), spriteAtlas.seeker, rgb(1,0,0,.5));

        

        if (this.hits != null && this.hits.length > 0 && aimToggle) {
            this.hits = engineObjectsRaycast(this.pos, this.pos.add(this.aimDir.normalize().scale(25)), enemies);
            drawTile(this.hits[0].pos, vec2(.3), spriteAtlas.seeker, RED);
        } 
        

        //drawTile(this.pos.add(this.aimDir.normalize().scale(5)).rotate(15), vec2(.3), spriteAtlas.seeker, rgb(1,0,0,.5));
    }

    destroy() {
        if (this.health < 1 || gameEnded) {
            super.destroy();
            return true;
        } else {
            return false;
        }
    }

    collideWithObject(object) {
        if(object instanceof Box) {
            this.lastTouchedBox = object;
        }

        return true;
    }
}

class Shield extends EngineObject
{
    constructor(pos)
    {
        super(pos, vec2(2,.5), null, 0, ORANGE); // set object position and size
        this.setCollision(); // make object collide
        this.mass = 0; // make object have static physics

        this.shieldSound = new Sound([2.6,,244,.01,.02,.18,1,1.6,,,,,,1,,.3,,.62,.06,,-2259]); // Hit 399

        this.destroyTimer = new Timer(1);
    }

    update() {
        super.update();

        this.pos = player.pos.add(player.aimDir.normalize().scale(3));

        this.angle = player.aimDir.angle();

        if(this.destroyTimer.elapsed()) {
            this.destroy();
        }
    }

    collideWithObject(object) {
        this.shieldSound.play();

        if(object instanceof Seeker) {
            object.destroy();
        }
    }
}

class Bullet extends EngineObject {
    constructor(pos, velocity, damage=1, speed=.5, tileinfo=0, angle=0, color=BLACK, dTime=1)
    {
        super(pos, vec2(.2), tileinfo, angle, color);
        this.setCollision(); // make object collide
        this.renderOrder = 2;
        this.damping = 0.98;
        this.velocity = velocity;

        //this.shootSound = new Sound([.7,,120,.02,.07,.06,,3.5,17,-9,,,,,,,,.59,.08,,99]); // Shoot 9
        this.shootSound = new Sound([1.4,,533,.02,.08,.22,,3.6,-5,,219,.07,,,,,,.77,.01,,413]); // Pickup 141
        this.redShootSound = new Sound([.8,,50,.04,.12,.2,4,3.2,6,,,,,1.8,.4,.3,,.47,.14,,666]); // Explosion 378
        this.wallHitSound = new Sound([1.1,,44,.01,.02,.09,4,2.4,-0.5,,,,,1.1,8.5,.4,,.6,.02]); // Hit 39 - Copy 5
        this.boxHitSound = new Sound([.4,,124,.01,.04,.04,5,1.1,-8,,,,,.8,,.1,,.98,.08,,638]); // Hit 45
        this.damage = damage;
        this.speed = speed;
        this.dTime = dTime;
        this.dTimer = new Timer(this.dTime);

        if(color == RED) {
            this.redShootSound.play();
        } else {
            this.shootSound.play();
        }

        // comet emitter - position updated each frame in gameUpdate
        this.cometEmitter = new ParticleEmitter(
            this.pos, 0,
            0, 0, 100, PI,
            tile(0),
            rgb(1,1,.3,.2), rgb(1,.5,.1,.2),
            rgb(1,0,0,0), rgb(.5,0,1,0),
            1, 1, 3, .01, 0,
            .95, 1, .02, PI, .2,
            .3, 0, 1, 0
        );
        

        bullets.push(this);
    }

    update() {
        super.update();

        this.cometEmitter.pos = this.pos;

        if(this.dTimer.elapsed()) {
            this.destroy();
        }
    }

    destroy() {
        bullets.pop(this);

        const hue = rand();
        const particleEmitter = new ParticleEmitter(
            this.pos, 0,
            0, 0.1, 500, PI,
            tile(0, 16),
            hsl(hue,1,.5),   hsl(hue,1,1),
            hsl(hue,1,.5,0), hsl(hue,1,1,0),
            2, .2, .2, .2, .05,
            .99, 1, 1, PI,
            .05, .8, true
        );
        particleEmitter.restitution = .5; // bounce when it collides
        particleEmitter.trailScale = 2;   // stretch as it moves

        this.cometEmitter.destroy();

        super.destroy();
    }
}

class PlayerBullet extends Bullet 
{
    constructor(pos, velocity, color=BLACK) {
        super(pos, vec2(.2), 1, 1, 0, 0, color);
        this.velocity = velocity;

        if (player.chargeShot) {
            this.size = vec2(2);
            this.color = BLUE;
            this.damage = this.damage * 6;
        }

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
    constructor(pos, velocity, damage, speed, dtime=1) {
        super(pos, velocity, damage, speed, 0, 0, BLACK, dtime);
    }

    collideWithObject(object) {
        if (object instanceof Enemy) {
            return false;
        }

        if (object instanceof Player) {
            object.takeDamage(this.damage);
            this.destroy();
        }

        if (object instanceof Shield) {
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

        this.id = randInt(32000);

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

        this.bulletDamage = 1;
        this.bulletSpeed = .5;
        this.shootRange = shootRange;
        this.shooting = false;
        this.shootRate = shootRate;
        this.shootTimer = new Timer(this.shootRate);

        this.enemyColor = color;

        this.atlas = null;
        this.currentFrame = 0;
        this.frameTime = .2;
        this.frameTimer = new Timer(this.frameTime);

        enemies.push(this);
    }

    update() {
        super.update();

        let bright = 0;
        if (this.damageTimer.isSet()) {
            bright = .5*percent(this.damageTimer, .15, 0);
        }
        
        this.color = rgb(this.enemyColor.r+bright, this.enemyColor.g+bright, this.enemyColor.b+bright, this.enemyColor.a);
    }

    render() {
        super.render();

        if(this.currentFrame > -1 && this.frameTimer.elapsed()) {
            if(this.currentFrame == 0) {
                this.currentFrame = 1;
            } else if(this.currentFrame == 1) {
                this.currentFrame = 0;
            }

            this.tileInfo = this.atlas.frame(this.currentFrame);
            this.frameTimer = new Timer(this.frameTime);
        }
    }

    patrol() {
        let newVel = vec2();

        if (this.state == "patrolout") {
            while(this.rdir == null) {
                // get random direction of length patrolDistance
                this.rdir = randVec2(this.patrolDistance);
                //hits = engineObjectsRaycast(this.pos, this.pos.add(this.rdir));
            }
        
            newVel = this.rdir.clampLength(1).scale(this.speed);

            if(abs(this.homePos.distance(this.pos)) > this.patrolDistance) {
                this.state == "comehome";
                this.rdir = null;
            }
        }

        if (this.state == "comehome") {
            newVel = this.velocity.add(this.pos.subtract(this.homePos).clampLength(1).scale(this.speed));

            if(abs(this.homePos.distance(this.pos)) < 0.1) {
                this.state == "patrolout";
            }
        }

        if (this.state == "seeking" && this.rdir != null) {
            newVel = this.rdir.clampLength(1).scale(this.speed);
        }

        this.velocity = newVel;
    }

    scanToShoot(speed, damage, dTime) {
        if(player != null && abs(this.pos.distance(player.pos)) < this.shootRange && !this.shooting) {
            this.shoot(speed, damage, dTime);
        }
    }

    shoot(speed, damage, dTime) {
        if(!this.shooting) {
            this.shooting = true;
            new EnemyBullet(this.pos, player.pos.subtract(this.pos).normalize().scale(speed), damage, speed, dTime);

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

    destroy() {
        // fire
        new ParticleEmitter(
            this.pos, 0,
            .5, .3, 200, PI,
            tile(0),
            rgb(1,.5,.1), rgb(1,.1,.1),
            rgb(1,.5,.1,0), rgb(1,.1,.1,0),
            .7, 2, 0, .2, .05,
            .9, 1, -1, PI, .05,
            .5, 0, 1, 0
        );

        // smoke
        new ParticleEmitter(
            this.pos, 0,
            1, .3, 50, PI,
            tile(0),
            hsl(0,0,0,.5), hsl(0,0,1,.5),
            hsl(0,0,0,0), hsl(0,0,1,0),
            .8, .5, 2, .2, .02,
            .85, 1, -1, PI, .3,
            .3, 0, 0, 1
        );

        for (let i=0;i<enemies.length;i++) {
            if(enemies[i].id == this.id) {
                enemies.splice(i, 1);
            }
        }

        super.destroy();
    }
}

class Roamer extends Enemy 
{
    constructor(pos, size, color) {
        super(pos, size, color, 3, 1, 0.1, 30, 15, 2.0);
        this.setCollision();
        this.renderOrder = 0;
        this.bulletDamage = 1;

        this.atlas = spriteAtlas.roamer;
        this.tileInfo = spriteAtlas.roamer;
    }

    update() {
        super.patrol();

        this.scanToShoot(this.bulletSpeed, this.bulletDamage, 1);

        super.update();
    }

    render() {
        // draw shadow
        drawTile(vec2(this.pos.x, this.pos.y-0.3), this.size, spriteAtlas.shadow, rgb(1,1,1,0.3), this.angle, this.mirror);

        super.render();
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
        super(pos, size, color, 1, 1, 0.2);
        this.setCollision();

        this.seekDistance = 40;
        this.seekAngle = 30;

        this.currentFrame = -1;

        this.atlas = spriteAtlas.seeker;
        this.tileInfo = spriteAtlas.seeker;
    }

    render() {
        // draw shadow
        drawTile(vec2(this.pos.x, this.pos.y-0.3), this.size, spriteAtlas.shadow, rgb(1,1,1,0.3), 0, this.mirror);

        super.render();
    }

    update() {
        super.patrol();

        super.update();

        if(this.velocity.x < 0) {
            this.angle -= .07;        
        } 
        if(this.velocity.x > 0) {
            this.angle += .07;
        }

        if(player != null && this.pos.distance(player.pos) < this.seekDistance) {
            this.state = "seeking";
            this.rdir = player.pos.subtract(this.pos);
        } else {
            this.state = "patrolout";
        }
    }

    collideWithObject(object) {
        if (object instanceof Player) {
            player.takeDamage(this.damage);
            super.takeDamage(1);
        }

        if (object instanceof Seeker) {
            return false;
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
        this.renderOrder = 0;

        this.dmgTimer = new Timer(.5);
        this.damageTime = 2.0;

        this.bulletSpeed = .2;
        this.bulletDamage = 10;
        this.shootRate = 5;
        this.shootTime = 5;
        this.shootRange = 20;

        this.atlas = spriteAtlas.turt;
        this.tileInfo = spriteAtlas.turt;
    }

    update() {
        super.patrol();

        super.update();

        super.scanToShoot(this.bulletSpeed, this.bulletDamage, 2);
    }

    render() {
        // draw shadow
        drawTile(vec2(this.pos.x, this.pos.y-0.1), this.size, spriteAtlas.shadow, rgb(1,1,1,0.3), this.angle, this.mirror);

        super.render();

        if(this.velocity.x < 0) {
            this.mirror = false;        
        } 
        if(this.velocity.x > 0) {
            this.mirror = true;
        }
    }

    collideWithObject(object) {
        if (object instanceof Player && this.dmgTimer.elapsed()) {
            object.takeDamage(this.damage);
            this.dmgTimer.set(this.damageTime);
        }

        if (object instanceof PhysicsObject) {
            if(this.rdir != null) {
                this.rdir = vec2(-this.rdir.x, -this.rdir.y);
            }
            
        }

        if (object instanceof Box) {
            if(this.rdir != null) {
                this.rdir = vec2(-this.rdir.x, -this.rdir.y);
            }
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
        super(pos, size.divide(vec2(1,4)), what, when, color); // set object position and size
        this.setCollision(); // make object collide
        this.mass = 0; // make object have static physics
        this.renderOrder = 1;

        this.bawksExplodeSound = new Sound([1.1,,34,.02,.29,.39,,2.1,-6,,350,,,.8,,.9,,.42]); // Explosion 150

        this.boxColor = color;
        this.healthMax = Math.ceil((size.x + size.y)/2) + 1;
        this.health = this.healthMax;
        this.drawSize = size;
        this.drawOffset = vec2(0,this.size.y);
    }

    render() {
        if(player != null && isOverlapping(player.pos, player.size, this.pos.add(vec2(0, this.size.y+this.size.y/2)), this.drawSize)) {
            this.renderOrder = 2;
            if(this.health/this.healthMax <= 0.5) {
                this.color = rgb(this.color.r, this.color.g, this.color.b, this.health/this.healthMax);
            } else {
                this.color = rgb(this.color.r, this.color.g, this.color.b, this.health/this.healthMax/2);
            }
        } else {
            this.renderOrder = 0;
            this.color = rgb(this.color.r, this.color.g, this.color.b, this.health/this.healthMax);
        }

        drawRect(this.pos.add(vec2(0, this.size.y+this.size.y/2)), this.drawSize, this.color);

        if(this.boxColor != null)
            drawRect(this.pos.add(vec2(0,-(this.size.y*1.5))), this.drawSize.add(vec2(0,-this.size.y*2)), rgb(this.boxColor.r, this.boxColor.g, this.boxColor.b, this.boxColor.a/4));
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

        this.tileInfo = spriteAtlas.portal;
        this.portalSound = new Sound([2.8,,113,.35,.38,.001,,3.4,,,-483,.02,.04,,1,,.17,.68,.05,.03,-1045]); // Random 216 - Mutation 6
    }

    update() {
        this.angle -= .5;
    }

    collideWithObject(object) {
        if (object instanceof Player) {
            this.portalSound.play();

            // check for end game and win
            if(player.colorsCollected.length == 7) {
                gameEnded = true;
                win = true;
                player.destroy();
            } else {
                engineObjectsDestroy();
                loadLevel();
            }

        }
    }
}

function getRandomColorLeft() {
    let rainbowColors = [RED, ORANGE, YELLOW, GREEN, BLUE, INDIGO, VIOLET];
    let playerCollectedColors = player.colorsCollected;
    let remainingColors = rainbowColors.filter(item => !playerCollectedColors.some(removeItem => item.r === removeItem.r && item.g === removeItem.g && item.b === removeItem.b));
    
    return remainingColors[randInt(0,remainingColors.length)];
}

class RainbowColor extends EngineObject {
    constructor(pos, pick)
    {
        super(pos, vec2(3), null, 0, pick);
        this.setCollision(); // make object collide
        this.renderOrder = 2;
        this.color = pick;
        this.colorValue = pick;

        this.tileInfo = spriteAtlas.rainbow;
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

    // setup level
    const levelSize = vec2(38, 500);    // size of play area
    cameraPos = levelSize.scale(.5);   // center camera in level
    canvasFixedSize = vec2(1280, 720); // use a 720p fixed size canvas

    const w = levelSize.x, h = levelSize.y;
    //new Floor(vec2(w/2, 249.5), vec2(w, 500), rgb(1,1,1,1)); // floor

    if(player.colorsCollected.length > 0) {
        const pos = vec2(0, 0);
        const tileLayer = new TileLayer(pos, vec2(38, 500));

        for (pos.x = tileLayer.size.x; pos.x--;)
        for (pos.y = tileLayer.size.y; pos.y--;)
        {
            // check if tile should be solid
            if (randBool(.7))
                continue;
            
            // set tile data
            const tileIndex = 96;
            const direction = 0;
            const mirror = randBool();
            const color = GREEN;
            const data = new TileLayerData(tileIndex, direction, mirror, color);
            tileLayer.setData(pos, data);
            //tileLayer.setCollisionData(pos);
        }
        tileLayer.tileInfo = spriteAtlas.grass
        tileLayer.redraw(); // redraw tile layer with new data
    }

    new PhysicsObject(vec2(0-.5, 249.5),  vec2(1, 500)); // left wall
    new PhysicsObject(vec2(w+.5, 249.5), vec2(1, 500)); // right wall
    new PhysicsObject(vec2(w/2, 0), vec2(38, 1)); // bottom wall
    new PhysicsObject(vec2(w/2, 499), vec2(38, 1)); // top wall

    randomColorLeft = getRandomColorLeft();
    let colorsArray = [];

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

        let color = BLACK;
        colorsArray = [];
        player.colorsCollected.forEach((c) => {
            colorsArray.push(c);
        })
        //colorsArray = player.colorsCollected;
        colorsArray.push(randomColorLeft);
        let collectedLength = colorsArray.length
        if (collectedLength > 0) {
            if(rand() < collectedLength/7 ) {
                color = colorsArray[randInt(0, collectedLength)];
            }
        }

        const o = new Box(pos, size, 0, 0, color);
        o.setCollision(); // make object collide
        o.mass = 0; // make object have static physics
    }

    // create random rainbow color to collect
    if (player.colorsCollected.length < 7) {
        let rainbowColors = [RED, ORANGE, YELLOW, GREEN, BLUE, INDIGO, VIOLET];
        let playerCollectedColors = player.colorsCollected;
        let remainingColors = rainbowColors.filter(item => !playerCollectedColors.some(removeItem => item.r === removeItem.r && item.g === removeItem.g && item.b === removeItem.b && item.a === removeItem.a));
        remainingColors.push(randomColorLeft);

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

            new RainbowColor(pos, randomColorLeft);
        }
    }

    // create portal to end level
    new Portal(vec2(19, 49), BLUE);
    
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
                size = vec2(1.5);
            } else {
                size = vec2(1);
            }

            pos = vec2(randInt(0+(size.x), levelSize.x-(size.x)), randInt(30, levelSize.y-(size.y)-6));

            for(let j=0; j < engineObjects.length; j++) {
                if(isOverlapping(pos, size, engineObjects[j].pos, engineObjects[j].size) && engineObjects[j].collideSolidObjects) {
                    spawnRedo = true;
                }
            }
        } while (spawnRedo)
        
        if (r > .2) {
            if(r > .5) {
                new Seeker(pos, size, GRAY);
            } else {
                new Roamer(pos, size, MAGENTA);
            }
        } else {
            new TurtTurt(pos, size, rgb(0, .5, 0));
        }
        
    }
}

function gameInit() {
    canvasFixedSize = vec2(lowResSize);

    // create a table of all sprites
    spriteAtlas =
    {
        player:  tile(0,16),
        portal: tile(16,16),
        rainbow: tile(32,16),
        roamer: tile(48,16),
        turt: tile(64,16),
        shadow: tile(80,16),
        grass: tile(96,16),
        seeker: tile(112,16),
    };

    
}

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
                engineObjectsDestroy();
                gameEnded = false;
                win = false;
                lose = false;
                intro = false;
                gameStarted = false;
                play_music("title");
                canvasFixedSize = vec2(lowResSize);
            }
        }

        if(gameStarted && !gameEnded) {
            if ((keyWasPressed('KeyL') || gamepadWasPressed(1)) && gameStarted) {
                engineObjectsDestroy();
                loadLevel();
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
        }
    }
}
function gameRender() {
    if(gameStarted) {
        drawRect(vec2(19, 250), vec2(38, 500), WHITE, 0, false);
    }
}
function gameRenderPost() {
    if(paused) {
        drawRect(cameraPos, canvasFixedSize, rgb(0,0,0,0.6));
        drawTextScreen('PAUSED', mainCanvasSize.scale(.5), 80);
    } else {
        if(intro && !gameStarted) {
            drawRect(vec2(0,0), vec2(100, 100), BLACK);
            drawTextScreen('A presentation by Raptor and Noah Zark\nLeft click, press bottom face button, or press Space to start!', mainCanvasSize.scale(.5), 40);
        }

        if(!intro && !gameStarted) {
            drawRect(vec2(0,0), vec2(100, 100), BLACK);
            const origin = -3.25;
            const w = .15;
            drawRect(vec2(origin,0), vec2(w, mainCanvasSize.y), GREEN);
            drawRect(vec2(origin+w,0), vec2(w, mainCanvasSize.y), ORANGE);
            drawRect(vec2(origin+w*2,0), vec2(w, mainCanvasSize.y), RED);
            drawRect(vec2(origin+w*3,0), vec2(w, mainCanvasSize.y), YELLOW);
            drawRect(vec2(origin+w*4,0), vec2(w, mainCanvasSize.y), BLUE);
            drawRect(vec2(origin+w*5,0), vec2(w, mainCanvasSize.y), INDIGO);
            drawRect(vec2(origin+w*6,0), vec2(w, mainCanvasSize.y), VIOLET);
            drawTextScreenColors('RAINBOW', mainCanvasSize.scale(.5).add(vec2(25,-60)), 38);
            drawTextScreen('\nRAMPAGE', mainCanvasSize.scale(.5).add(vec2(28,-40)), 38, GRAY);

            drawTextScreen('Left click OR\nPress bottom face button OR \nPress Space to start!', mainCanvasSize.scale(.5).add(vec2(-62,90)), 10, WHITE, 0, BLACK, "left");
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

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, ['tiles.png']);