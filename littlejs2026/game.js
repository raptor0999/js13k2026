/*
    LittleJS JS13K Starter Game
    - For size limited projects
    - Includes all core engine features
    - Builds to 7kb zip file
*/

setShowWatermark(false);
const lowResSize = 256;


let spriteAtlas;
let intro = false;
let gameStarted = false;
let gameEnded = false;
let win = false;
let lose = false;
let levelTint = WHITE;
let vertScrollSpeed = .1;
let player;
let enemies = [];
let bullets = [];
let boxes = [];
let randomColorLeft = null;
let aimToggle = true;

let tuts = [true, false, false, false, false, false, false];
let tutTimer = new Timer(0);
let tutTime = 10;
let tutsMsgs = ['To move around -- use WASD or Left Stick\n You can move in shadows of boxes and walk behind them.', 
            'Guide your aim with Mouse or Right stick.', 
            'Left click or right trigger to shoot!\n\nYour firerate and clip size are limited so aim better.\nThe boxes are destructible upon being hit!', 
            'Reload via -- Press R, Right Click or Top Right bumper.\n\nThe character turns red while reloading.', 
            'To advance towards further levels, collect\nthe pieces of rainbow scattered across the level --\nit grants you the power to go through \nthe swirling portals, and a powerup.', 
            'Watch out for enemies snooping around levels!\n\nUse your powers and shoot them to defeat\n or avoid them and try to gallop.', 
            'Touch colored boxes to recharge the matched powerup. \nLimit 2 per color at any time.'];
let curTut = 0;
let popMsg = false;
let msg = '';

const INDIGO = rgb(.29,0,.51);
const VIOLET = rgb(.93,.51,.93);
let rainbowColors = [VIOLET,INDIGO,YELLOW,RED,BLUE,ORANGE,GREEN];
let colorMsgs = ['Green is healing. Stand next to green boxes\nuntil they fade and explode to gain Green power.\n\nUse selected power with E or left face button.\n\nNOTE: Charge color powers by standing next to color boxes!',
'Orange is shield. Press E or left face \nbutton to use selected color power. Your shield can block bullets \n and also help destroy enemies without you taking damage.\n\nUse Q, [], or DPad left right to select color power.',
 'Blue is charge shot. You will turn blue as you charge.\n When finished charging, your next shot will be\n a large, powerful charge shot.',
  'Red is burst fire. Each shot you shoot is much\n more powerful while using burst fire.\nMake sure you reload first!',
   'Yellow is invulnerable. You cannot be damaged.\nTake advantage!',
    'Indigo is screen wipe. This will clear the viewable screen of enemies.',
     'Violet is mystery!'];
let levelColorCollected = false;

// music section
let audio = document.createElement("audio");
audio.loop = true;
audio.volume = 1;
let snd = document.createElement("audio");
snd.loop = false;
snd.volume = .3;
let a_src = [title_song,track1_song,colorcollect_song,enemydie_song];
let a_done = [false,false,false,false]
let a_player = [new CPlayer(),new CPlayer(),new CPlayer(),new CPlayer()];
let m_arr = [];

for(let i=0;i<a_src.length;i++) {
    var t0 = new Date();
    a_player[i].init(a_src[i]);

    setInterval(function () {
        if (a_done[i])
          return;

        a_done[i] = a_player[i].generate() >= 1;

        if (a_done[i]) {
          m_arr.push(URL.createObjectURL(new Blob([a_player[i].createWave()], {type: "audio/wav"})));

          if(i == 0)
            play_music("title");
        }
    });
}

function play_sound(type) {
    snd.currentTime = 0.0;

    if(type == "color_collect") {
        snd.src = m_arr[0];

        snd.play();
    }

    if(type == "enemy_die") {
        snd.src = m_arr[1];

        snd.play();
    }
}

function play_music(type) {
    audio.pause();
    audio.currentTime = 0;

    if(type == "title") {
        audio.volume = 1;
        audio.src = m_arr[3];
    }

    if(type == "track1") {
        audio.volume = .3;
        audio.src = m_arr[2];
    }

    if(type == "lose") {
        audio.volume = 1;
        audio.src = m_arr[4];
    }

    audio.play();
}

function toggle_music() {
    if(audio.paused)
        audio.play();
    else
        audio.pause();
}

function stop_music(type) {
    audio.pause();
    audio.currentTime = 0;
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
        this.colorPowerUsageMax = 2;
        this.lastColorCollected = null;
        this.colorPowerSelected = 0;
        this.roundsMax = 6;
        this.roundsLoaded = 6;
        this.shootTimer = new Timer;
        this.shootTime = .5;
        this.reloadTime = 2.0;
        this.reloading = false;

        this.hitSound = new Sound([1.6,,418,.01,.08,.09,4,2.2,1,,,,,1.8,,.1,.05,.53,.08,,149]); // Hit 2
        this.colorDrainSound = new Sound([,,531,.07,.29,.2,,3.7,,200,206,.14,.03,,,.1,,.53,.25,.18]); // Powerup 21
        this.powerUpSound = new Sound([.2,,474,.08,.24,.28,,0,5,,163,.08,,,,,,.68,.26]); // Powerup 42
        this.reloadingSound = new Sound([,,225,.06,.26,.06,1,.7,,3,-85,.14,,,,,,.53,.14]); // Powerup 150
        this.reloadedSound = new Sound([1.6,,103,.01,.03,.03,,2.6,,,-366,,,,3,,.01,.82,.01,.19]); // Blip 147

        this.healthMax = 5;
        this.health = 5;
        this.damage = 1;
        this.damageTimer = new Timer;
        this.speed = .06;
        this.currentLevel = 1;

        this.lastTouchedBox = null;
        this.powerUpTime = 1.0;
        this.powerUpTimer = new Timer;

        this.colorTimer = new Timer;
        this.timerColor = '';

        this.chargeShot = false;
        this.indigoDistance = 25.0;
        this.indigoDamage = 5.0;

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

    selectColorPower(dir) {
        this.colorPowerSelected += dir;

        if(this.colorPowerSelected < 0)
            this.colorPowerSelected = this.colorsCollected.length-1;

        if(this.colorPowerSelected > this.colorsCollected.length-1)
            this.colorPowerSelected = 0;
    }

    collectPower(col) {
        for(let i=0;i<this.colorsCollected.length;i++) {
            if(colEq(col, this.colorsCollected[i])) {
                this.colorPowerUsage[i] += 1;
                if(this.colorPowerUsage[i] > this.colorPowerUsageMax)
                    this.colorPowerUsage[i] = this.colorPowerUsageMax;
            }
        }

        this.colorDrainSound.play();
        this.lastTouchedBox.destroy();
        this.lastTouchedBox = null;
    }

    checkColorUsage(color) {
        for(let i=0;i<this.colorsCollected.length;i++) {
            if(colEq(this.colorsCollected[i], color)) {
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
                this.colorTimer.set(2);
                if(this.health > this.healthMax)
                    this.health = this.healthMax;
            }
            if(col == ORANGE) {
                this.colorTimer.set(1);
                new Shield(player.pos.add(vec2(0,2)));
            }
            if(col == RED) {
                this.colorTimer.set(5);
            }
            if(col == YELLOW) {
                this.yellowTimer.set(10);
            }
            if(col == BLUE) {
                this.blueTimer.set(3);
                this.chargeShot = false;
            }
            if(col == INDIGO) {
                this.indigoTimer.set(5);

                for (let i=0;i<enemies.length;i++) {
                    if(enemies[i].pos.distance(player.pos) < this.indigoDistance) {
                        enemies[i].takeDamage(this.indigoDamage);
                    }
                }
            }
            if(col == VIOLET) {

            }

            this.timerColor = col;
            this.playerColor = col;

            this.useColorPower(colorUsage);
        }
    }

    useColorPower(colorNumber) {
        player.colorPowerUsage[colorNumber] -= 1;
    }

    takeDamage(damage) {
        if(!this.colorTimer.isSet() && !this.timerColor != YELLOW) {
            this.health -= damage;
            this.damageTimer.set();
        }
        
        this.hitSound.play();

        if(this.health < 1) {
            popMessage('You died. But fortunately this is not the end for you!\nYou will respawn on the level you died on.');
            this.health = this.healthMax;
            dieAndLoad();
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

             if (keyWasPressed('BracketLeft') || gamepadWasPressed(14))
                this.selectColorPower(-1);

            if (keyWasPressed('BracketRight') || keyWasPressed('KeyQ') || keyWasPressed('Tab') || gamepadWasPressed(15))
                this.selectColorPower(1);

            for(let i=0;i<7;i++) {
                if(keyWasPressed("Digit"+(i+1)))
                    this.usePower(this.colorsCollected[i]);
            }

            if(keyWasPressed('KeyE') || gamepadWasPressed(2))
                this.usePower(this.colorsCollected[this.colorPowerSelected]);

            if(this.lastTouchedBox) {
                let dist = (abs(this.pos.distance(this.lastTouchedBox.pos)) - 1 - ((this.lastTouchedBox.size.x+this.lastTouchedBox.size.y)/2)/2);

                //console.log(this.lastTouchedBox.boxColor);

                if(JSON.stringify(this.lastTouchedBox.boxColor) != JSON.stringify(BLACK) && dist < 1) {
                    if(!this.powerUpTimer.isSet()) {
                        this.powerUpTimer.set(this.powerUpTime);
                    }

                    this.lastTouchedBox.health -= 0.08; 
                }

                if(JSON.stringify(this.lastTouchedBox.boxColor) != JSON.stringify(BLACK) && dist > 1) {
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

            if(this.colorTimer.elapsed()) {
                this.colorTimer.unset();
                this.timerColor = '';
                this.playerColor = this.playerColorDefault;

                if (this.timerColor == BLUE) 
                    player.chargeShot = true;
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

        cameraPos = cameraPos.lerp(this.pos.add(vec2(0, this.currentAlterCamDistance)), .2);

        cameraPos = cameraPos.lerp(this.pos.add(this.aimDir), .1);
    }

    shoot() {
        // check if we have a round to shoot or not
        if (this.roundsLoaded > 0) {
            if (!this.shootTimer.isSet() && !this.colorTimer.isSet() && this.timerColor != ORANGE) {
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
                if(this.colorTimer.isSet() && this.timerColor == RED) {
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

        if(this.chargeShot)
            this.color = BLUE;

        // draw shadow
        drawTile(vec2(this.pos.x, this.pos.y-0.4).add(this.drawOffset), vec2(1.9), spriteAtlas.shadow, rgb(1,1,1,0.3), this.angle, this.mirror);
        
        if(this.velocity.x < 0)
            this.mirror = true;
        else
            this.mirror = false;

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

        if (aimToggle) {
            //this.hits = engineObjectsRaycast(this.pos, this.pos.add(this.aimDir.normalize().scale(25)), enemies);
            drawTile(this.pos.add(this.aimDir.normalize().scale(5)), vec2(.3), spriteAtlas.seeker, RED);
        } 
    }

    destroy() {
        if (this.health < 1 || gameEnded) {
            super.destroy();
            return true;
        } else
            return false;
    }

    collideWithObject(object) {
        if(object instanceof Box)
            this.lastTouchedBox = object;

        return true;
    }
}

function colEq(col1, col2) {
    if(col1.r == col2.r && col1.g == col2.g && col1.b == col2.b) 
        return true;
    
    return false
}

class Shield extends EngineObject
{
    constructor(pos)
    {
        super(pos, vec2(1,1), null, 0, ORANGE);
        this.setCollision(); 
        this.mass = 0; 

        this.shieldSound = new Sound([1.1,,543,.02,.03,.03,,2.5,-2,,67,.05,.01,,,,,.57,.01,.07]); 
        this.destroyTimer = new Timer(1);

        this.tileInfo = spriteAtlas.shield;
    }

    update() {
        super.update();

        this.pos = player.pos.add(player.aimDir.normalize().scale(3));
        this.angle = player.aimDir.angle();

        if(this.destroyTimer.elapsed())
            this.destroy();
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

        this.shootSound = new Sound([1.4,,533,.02,.08,.22,,3.6,-5,,219,.07,,,,,,.77,.01,,413]);
        this.redShootSound = new Sound([.8,,50,.04,.12,.2,4,3.2,6,,,,,1.8,.4,.3,,.47,.14,,666]);
        this.wallHitSound = new Sound([1.1,,44,.01,.02,.09,4,2.4,-0.5,,,,,1.1,8.5,.4,,.6,.02]);
        this.boxHitSound = new Sound([.4,,124,.01,.04,.04,5,1.1,-8,,,,,.8,,.1,,.98,.08,,638]);
        this.damage = damage;
        this.speed = speed;
        this.dTime = dTime;
        this.dTimer = new Timer(this.dTime);

        if(color == RED) 
            this.redShootSound.play();
        else 
            this.shootSound.play();


        bullets.push(this);
    }

    update() {
        super.update();

        if(this.dTimer.elapsed()) {
            this.destroy();
        }
    }

    destroy() {
        bullets.pop(this);

        super.destroy();
    }
}

class PlayerBullet extends Bullet 
{
    constructor(pos, velocity, color=BLACK) {
        super(pos, vec2(.2), 1, 1, 0, 0, color);
        this.velocity = velocity;

        if (player.chargeShot) {
            this.size = vec2(1.5);
            this.color = BLUE;
            this.tileInfo = spriteAtlas.charge;
            this.damage = this.damage * 6;
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
            this.boxHitSound.play();
            object.takeDamage(this.damage);
            this.destroy();
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
        super(pos, size, null, 0, color); 
        this.setCollision();
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

    scanToShoot(object, speed, damage, dTime) {
        if(object != null && abs(this.pos.distance(object.pos)) < this.shootRange && !this.shooting) {
            this.shoot(object, speed, damage, dTime);
        }
    }

    shoot(object, speed, damage, dTime) {
        if(!this.shooting) {
            this.shooting = true;
            new EnemyBullet(this.pos, object.pos.subtract(this.pos).normalize().scale(speed), damage, speed, dTime);

            setTimeout(() => { this.shooting = false; }, this.shootRate*1000);
        }
    }

    takeDamage(damage) {
        this.health -= damage;
        this.damageTimer.set();

        if(this.health < 1) {
            play_sound("enemy_die");
            this.destroy();
        } else 
            this.hitSound.play();     
    }

    doDamage(damage, object) {
        object.takeDamage(damage);
    }

    destroy() {
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

        this.scanToShoot(player, this.bulletSpeed, this.bulletDamage, 1);

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

        if(this.velocity.x < 0)
            this.angle -= .07;

        if(this.velocity.x > 0)
            this.angle += .07;

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


class TurtTurt extends Enemy 
{
    constructor(pos, size, color) {
        super(pos, size, color, 5, 3, 0.05);
        this.setCollision();
        this.renderOrder = 0;

        this.dmgTimer = new Timer(.5);
        this.damageTime = 2.0;

        this.bulletSpeed = .4;
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

        // find boxes within shoot range
        if(player != null && this.pos.distance(player.pos) < this.shootRange*2) {
            let bs = [];
            let bd = [];
            for(const b of boxes) {
                let d = this.pos.distance(b.pos)
                if(d <= this.shootRange) {
                    bs.push(b);
                    bd.push(d);
                }
            }

            // find closest box to shoot
            super.scanToShoot(bs[bd.indexOf(Math.min(...bd))], this.bulletSpeed, this.bulletDamage, 3);
        }
        
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

class PhysicsObject extends EngineObject
{
    constructor(pos, size)
    {
        super(pos, size, null, 0, BLACK);
        this.setCollision();
        this.mass = 0;
    }
}

class Box extends EngineObject
{
    constructor(pos, size, what, when, color)
    {
        super(pos, size.divide(vec2(1,4)), what, when, color);
        this.setCollision();
        this.mass = 0;
        this.renderOrder = 1;

        this.id = rand(64000);

        this.bawksExplodeSound = new Sound([1.1,,34,.02,.29,.39,,2.1,-6,,350,,,.8,,.9,,.42]);

        this.boxColor = color.copy();
        this.healthMax = Math.ceil((size.x + size.y)/2) + 1;
        this.health = this.healthMax;
        this.drawSize = size;
        this.drawOffset = vec2(0,this.size.y);
    }

    update() {
        super.update();

        if(this.health < 1) {
            this.bawksExplodeSound.play();
            this.destroy();
        }
    }

    render() {
        if(player != null && isOverlapping(player.pos, player.size, this.pos.add(vec2(0, this.size.y+this.size.y/2)), this.drawSize)) {
            this.renderOrder = 2;
            if(this.health/this.healthMax <= 0.5) {
                this.color = rgb(this.boxColor.r, this.boxColor.g, this.boxColor.b, this.health/this.healthMax);
            } else {
                this.color = rgb(this.boxColor.r, this.boxColor.g, this.boxColor.b, this.health/this.healthMax/2);
            }
        } else {
            this.renderOrder = 0;
            this.color = rgb(this.boxColor.r, this.boxColor.g, this.boxColor.b, this.health/this.healthMax);
        }

        drawRect(this.pos.add(vec2(0, this.size.y+this.size.y/2)), this.drawSize, this.color);

        if(this.boxColor != null)
            drawRect(this.pos.add(vec2(0,-(this.size.y*1.5))), this.drawSize.add(vec2(0,-this.size.y*2)), rgb(this.boxColor.r, this.boxColor.g, this.boxColor.b, this.health/this.healthMax/4));
    }

    takeDamage(damage) {
        this.health -= damage;
    }

    destroy() {
        for (let i=0;i<boxes.length;i++) {
            if(boxes[i].id == this.id) {
                boxes.splice(i, 1);
            }
        }

        super.destroy();
    }
}

class Portal extends EngineObject {
    constructor(pos, color)
    {
        super(pos, vec2(3), null, 0, color);
        this.setCollision(); // make object collide
        this.renderOrder = 2;

        this.tileInfo = spriteAtlas.portal;
        this.portalSound = new Sound([2.8,,113,.35,.38,.001,,3.4,,,-483,.02,.04,,1,,.17,.68,.05,.03,-1045]);
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
                player.currentLevel += 1;
                dieAndLoad();
            }

        }
    }
}

class RainbowColor extends EngineObject {
    constructor(pos, pick)
    {
        super(pos, vec2(3), null, 0, pick);
        this.setCollision();
        this.renderOrder = 2;
        this.color = pick;
        this.colorValue = pick;

        this.tileInfo = spriteAtlas.rainbow;
    }

    collideWithObject(object) {
        if (object instanceof Player) {
            object.collectColor(this.colorValue);
            play_sound("color_collect");
            levelColorCollected = true;
            rainbowColors.pop();
            this.destroy();
            popMessage(colorMsgs[player.colorsCollected.length-1]);
        }   
    }
}

function loadLevel(leveNumber) {
    play_music("track1");

    if(player.lastColorCollected) {
        levelTint = player.lastColorCollected;
    }

    player.roundsLoaded = player.roundsMax;
    player.reloading = false;

    // setup level
    const levelSize = vec2(38, 250);    // size of play area
    cameraPos = levelSize.scale(.5);   // center camera in level
    canvasFixedSize = vec2(1280, 720); // use a 720p fixed size canvas

    const w = levelSize.x, h = levelSize.y;

    if(player.colorsCollected.length > 1) {
        const pos = vec2(0, 0);
        const tileLayer = new TileLayer(pos, vec2(w, h-1));

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
            const color = rgb(.5,player.currentLevel/7,player.currentLevel/14);
            const data = new TileLayerData(tileIndex, direction, mirror, color);
            tileLayer.setData(pos, data);
        }
        tileLayer.tileInfo = spriteAtlas.grass
        tileLayer.redraw();
    }

    new PhysicsObject(vec2(0-.5, levelSize.y/2-.5),  vec2(1, levelSize.y)); // left wall
    new PhysicsObject(vec2(w+.5, levelSize.y/2-.5), vec2(1, levelSize.y)); // right wall
    new PhysicsObject(vec2(w/2, 0), vec2(38, 1)); // bottom wall
    new PhysicsObject(vec2(w/2, levelSize.y-1), vec2(38, 1)); // top wall

    let colorsArray = [];

    // create collision objects
    for (let i=100; i--;)
    {
        let size = vec2(0);
        let pos = vec2(0);
        let spawnRedo = true;

        do 
        {
            spawnRedo = false;
            size = vec2(rand(1,6),rand(1,6));
            pos = vec2(randInt(0+(size.x/2), levelSize.x-(size.x/2)), randInt(0+(size.y/2)+6, levelSize.y-(size.y/2)-12));

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
        
        colorsArray.push(rainbowColors[rainbowColors.length-1]);
        let collectedLength = colorsArray.length
        if (collectedLength > 0) {
            if(rand() < collectedLength/7 ) {
                color = colorsArray[randInt(0, collectedLength)];
            }
        }

        const o = new Box(pos, size, 0, 0, color);
        o.setCollision();
        o.mass = 0;

        boxes.push(o);
    }

    // create random rainbow color to collect
    if (player.colorsCollected.length < 7) {
        let size = vec2(0);
        let pos = vec2(0);
        let spawnRedo = true;

        do 
        {
            spawnRedo = false;
            size = vec2(3);
            pos = vec2(randInt(6, levelSize.x-6), randInt(levelSize.y/2, levelSize.y-10));

            for(let j=0; j < engineObjects.length; j++) {
                if(isOverlapping(pos, size, engineObjects[j].pos, engineObjects[j].size) && engineObjects[j].collideSolidObjects) {
                    spawnRedo = true;
                }
            }
        } while (spawnRedo)

        //new RainbowColor(vec2(19, 20), rainbowColors[rainbowColors.length-1]);
        new RainbowColor(pos, rainbowColors[rainbowColors.length-1]);
    }

    // create portal to end level
    //new Portal(vec2(19, 30), BLUE);
    new Portal(vec2(19, levelSize.y-10), BLUE);
    
    player.pos = vec2(19, 3);

    cameraPos = player.pos.add(vec2(0,-5));

    // create enemies
    if(player.currentLevel > 1) {
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
                    if(player.currentLevel > 2)
                        new Roamer(pos, size, MAGENTA);
                }
            } else {
                if(player.currentLevel > 3)
                    new TurtTurt(pos, size, rgb(0, .5, 0));
            }
            
        }
    }
    
}

function gameInit() {
    canvasFixedSize = vec2(lowResSize);

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
        shield: tile(128,16),
        charge: tile(144,16),
    };
}

function gameUpdate() {
    if(!paused) {
        if(!intro && !gameStarted) {
            if(keyWasPressed('Space') || gamepadWasPressed(0) || mouseWasPressed(0)) {
                inputClear();
                gameStarted = true;
                player = new Player(vec2(19, 3));
                loadLevel(player.currentLevel);
            }
        }

        if(intro) {
            if(keyWasPressed('Space') || gamepadWasPressed(0) || mouseWasPressed(0)) {
                inputClear();
                intro = false;
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
                rainbowColors = [VIOLET,INDIGO,YELLOW,RED,BLUE,ORANGE,GREEN];
                levelColorCollected = false;
            }
        }

        if(gameStarted && !gameEnded) {
            if ((keyWasPressed('KeyL') || gamepadWasPressed(1)) && gameStarted) {
                dieAndLoad();
            }
        }

        if (keyWasPressed('KeyM'))
            toggle_music();
    }
}

function dieAndLoad() {
    engineObjectsDestroy();
    loadLevel(player.currentLevel);
}

function gameUpdatePost() {
    if(gameStarted && !gameEnded) {
        if((keyWasPressed('KeyP') || gamepadWasPressed(9)) && gameStarted) {
            paused = !paused;
        }

        if(curTut < tuts.length && tutTimer.elapsed()) {
            tutTimer.unset();
            popMessage(tutsMsgs[curTut]);
        }

        if(popMsg && (mouseWasPressed(0) || keyWasPressed('Space') || gamepadWasPressed(0))) {
            inputClear();
            tutTimer.set(tutTime);
            popMsg = false;
            msg = '';
            paused = false;

            if (curTut < tuts.length) {
                for(let t in tuts) {
                    tuts[t] = false;
                }

                curTut++;

                if(curTut < tuts.length) {
                    tuts[curTut] = true;
                }

            }
        }

        
    }
}

function popMessage(m) {
    popMsg = true;
    msg = m;
    paused = true;
}


function gameRender() {
    if(gameStarted) {
        let c = WHITE;
        if(player != null && player.colorsCollected.length > 1)
            c = rgb(0,.8,0);
        drawRect(vec2(19, 125), vec2(38, 249), c, 0, false);
    }
}

function gameRenderPost() {
    if(paused) {
        if(popMsg) {
            drawRect(cameraPos, vec2(100, 10), rgb(0,0,0,0.5));
            drawTextScreen(msg + '\n\nLeft click, press bottom face button, or press Space', mainCanvasSize.scale(.5), 40);
        } else {
            drawRect(cameraPos, canvasFixedSize, rgb(0,0,0,0.6));
            drawTextScreen('PAUSED', mainCanvasSize.scale(.5), 80);
        }
    } else {
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

            if(player != null && player.colorsCollected.length > 0) {
                drawRect(vec2(130, 90), vec2(240, 30), WHITE, 0, true, true);
            }
            
            let s = 43;
            for(let i=0;i<player.colorsCollected.length;i++) {
                if(i == player.colorPowerSelected)
                    drawRect(vec2(s, 90), vec2(30), GRAY, 0, true, true);
                drawRect(vec2(s, 90), vec2(25), player.colorsCollected[i], 0, true, true);
                let usage = player.colorPowerUsage[i];
                let uCol = BLACK;
                if(usage == 0)
                    uCol = RED;
                drawTextScreen(usage, vec2(s, 90), 15, uCol);
                s += 32;
            }
        }
    }
}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, ['tiles.png']);