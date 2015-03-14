var map, panorama, gpsTracker;
var dirService;
var playerMarker;
var zombies = [];
var timeSpent = 0;
var totalMoves = 0;
var playerBuffer = 180;
var timeInt;
var FPS = 3;
var fpsInt = 1000/FPS;
var zombieMoveDist = 0.00001;
var zombieDistributionRange = 1000;
var zombieAwareRadius = 500;
var zombieAsleepRadius = 700;
var zombieVisibleRadius = 150;
var zombiesInVisibleRadius = false;
var dieRadius = 5;
var aniFinish;
var aniAmt = 10;
var povAniInt;
var playerData;
var isPaused = false;
var healthPrice = 25;
var powerPrice = 25;
var positionTracked = false;
var totalZombies = 15;
var zombiesTargetPosition;
var autosaveTimer;

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        console.log('Device ready!');
    },
};

function Zombie(pos) {
    
    var health; // Zombie's health

    var route;
    var moveTimer;
    var imgW = 139;
    var imgH = 373;
    var smallMult = 0.5; //0.05;
    var anchorMult = 0.4;

    var zombieSprites = [
        {
            file:'img/zombie/zombie4.png',
            width:244,
            height:708,
            speed: 1,
            anchorMult:0.3
        },
        {
            file:'img/zombie/zombie5.png',
            width:437,
            height:664,
            speed: 1,
            anchorMult:0.4
        },
        {
            file:'img/zombie/zombie6.png',
            width:413,
            height:420,
            speed: 1,
            anchorMult:0.6
        }
    ];
    
    var curSprite = zombieSprites[Math.round(Math.random()*(zombieSprites.length-1))];

    var image = new google.maps.MarkerImage(curSprite.file,
            new google.maps.Size(curSprite.width,curSprite.height),
            new google.maps.Point(0,0),
            new google.maps.Point((curSprite.width*smallMult)/2,curSprite.height*smallMult),
            new google.maps.Size(curSprite.width*smallMult,curSprite.height*smallMult)
        );

    var mapMarker = new google.maps.Marker({
        map: map,
        icon: 'img/marker/zombie.png'
    });
    var panoramaMarker = new google.maps.Marker({
        map: panorama,
        visible: false,
        icon: image,
        clickable: true
    });
    var health = 100;
    
    function setVisible(flag) {
        mapMarker.setVisible(flag);
        panoramaMarker.setVisible(flag && game.isPanoramaView() ? flag : !flag);
    }
    
    function isDead() {
        return ((health <= 0) ? true : false);
    }
    
    function spawn() {
        health = 100;
        var center = playerMarker.getPosition();
        var heading = Math.random()*360;
        var dist = playerBuffer + (Math.random()*(zombieDistributionRange-playerBuffer));
        var pos = google.maps.geometry.spherical.computeOffset(center,dist,heading);
        mapMarker.setPosition(pos);
        panoramaMarker.setPosition(pos);
        setVisible(true);
    }
    
    function setPosition(pos) {
        mapMarker.setPosition(pos);
        panoramaMarker.setPosition(pos);
        var dist = google.maps.geometry.spherical.computeDistanceBetween(getPosition(),playerMarker.getPosition());

        if (dist<dieRadius) {
            playerData['health'] = playerData['health'] - 25;
            updateHealthImage();
            if (playerData['health'] <= 0) {
                stopMove();
                gameOver(getPosition());
            } else {
                spawn();
            }
        }
        // Uno zombie è dentro la visuale
        if(dist<=zombieVisibleRadius){
            if (zombiesInVisibleRadius == false) {
                panorama.setVisible(true);
                playerMarker.circle.setOptions({
                    strokeColor: 'red',
                    fillColor: 'red'
                });
                game.toggleView();
            }
            zombiesInVisibleRadius = true;
            panoramaMarker.setVisible(true);
        }
    }
    
    function getPosition() {
        return mapMarker.getPosition();
    }

     // Get directions to player
    function getDirections(){
        var dirReq = {
            origin:mapMarker.getPosition(),
            destination: playerMarker.getPosition(),
            travelMode: google.maps.DirectionsTravelMode.WALKING
        };
        dirService.route(dirReq,function(result,status) {
            if (status == google.maps.DirectionsStatus.OK) {
                route = result.routes[0].overview_path;
                checkPosition();
            }
        });
    }
    
    function redirect() {
        getDirections();
    }
    
    function nextMove() {
        var newZombPos;
        if (route.length>0 && !isPaused) {
            if (getPosition()==route[0]) {
                route.shift();
            }
            if (route[0]) {
                var nextX = route[0].lat();
                var nextY = route[0].lng();
                var zombieX = getPosition().lat();
                var zombieY = getPosition().lng();
                var crowLength = Math.sqrt(Math.pow(zombieX-nextX,2)+Math.pow(zombieY-nextY,2));
                if(zombieMoveDist>crowLength){
                    newZombPos = route[0];
                }
                else{
                    var pctMove = zombieMoveDist/crowLength;
                    var newX = zombieX-(pctMove * (zombieX-nextX));
                    var newY = zombieY-(pctMove * (zombieY-nextY));
                    newZombPos = new google.maps.LatLng(newX,newY);
                }
               setPosition(newZombPos);
            }
            
        }
        moveTimer = setTimeout(nextMove, 1000/FPS);
    }
    
    function startMove() {
        if(route && !moveTimer){
            //moveInt = setInterval(move,1000/FPS);
            moveTimer = setTimeout(nextMove, 1000/FPS);
        }
       
    }
    
    function stopMove(){
        if(moveTimer){
            clearTimeout(moveTimer);
            moveTimer = null;
        }
    }
    
    function checkPosition() {
        dist = google.maps.geometry.spherical.computeDistanceBetween(getPosition(),playerMarker.getPosition());
	    if(dist<zombieAwareRadius){
		startMove();
	    }else if(dist>zombieAsleepRadius){
		stopMove();
	    }
    }
    
    function isInPlayerVisibleRadius() {
        return (google.maps.geometry.spherical.computeDistanceBetween(mapMarker.getPosition(), playerMarker.getPosition()) <= zombieVisibleRadius);
    }
    
    
    function hit() {
        flash();
        lowLag.play('fx/GUN_FIRE-GoodSoundForYou-820112263.mp3');
        health = health - playerData['power'];
        if (isDead()) {
            spawn();
            
            zombiesInVisibleRadius = zombies.some(function(element, index, array) {
                return element.isInPlayerVisibleRadius();
            });
            
            if (zombiesInVisibleRadius == false) {
                playerMarker.circle.setOptions({
                    strokeColor: 'black',
                    fillColor: 'black'
                });
                game.toggleView();
                panorama.setVisible(false);
            }
        }
    }
    
    // Run once
    google.maps.event.addListener(panoramaMarker, 'click', function() {
        hit();
    });
    
    return {
        getPosition:getPosition,
        startMove:startMove,
        stopMove:stopMove,
        nextMove:nextMove,
        redirect:redirect,
        isDead:isDead,
        isInPlayerVisibleRadius:isInPlayerVisibleRadius,
        spawn:spawn,
        moveTimer:moveTimer,
    };
}

function checkZombies() {
    var zom;
    var dist;
    var i;
    for(i in zombies){
        zombies[i].checkPosition();
    }
}
    
function mainLoop() {
    checkZombies();
}

function toggle_visibility(id) {
   var e = document.getElementById(id);
   isPaused = !isPaused;
   if(e.style.display == 'block')
      e.style.display = 'none';
   else
      e.style.display = 'block';
}

var game = {
    init : function() {
    
        playerData = JSON.parse(localStorage['data']);
        
        // Initialize Google Maps and Street View
        dirService = new google.maps.DirectionsService();
        
        var panoramaOptions = {
            //visible: false,
            disableDoubleClickZoom:true,
            disableDefaultUI: true,
        };
        
        panorama = new google.maps.StreetViewPanorama(document.getElementById('panorama-canvas'), panoramaOptions);

        var mapOptions = {
            zoom: 16,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            disableDefaultUI: true,
            draggable: false,
            disableDoubleClickZoom: true,
            streetView : panorama,
        };
        
        map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
        
        var playerIcon = new google.maps.MarkerImage(
            playerData['sex'] == 'f' ? 'img/marker/player_female.png' : 'img/marker/player.png',
            null, /* size is determined at runtime */
            null, /* origin is 0,0 */
            null, /* anchor is bottom center of the scaled image */
            new google.maps.Size(62, 68)
        ); 
        
        playerMarker = new google.maps.Marker({
            map: map,
            icon: playerIcon,
        });
        
        playerMarker.circle = new google.maps.Circle({
            map: map,
            center: playerMarker.getPosition(),
            radius: zombieVisibleRadius,
        });
        
        playerMarker.circle.bindTo('center', playerMarker, 'position');

        // Try HTML5 geolocation
        if(navigator.geolocation) {
            gpsTracker = navigator.geolocation.watchPosition(function(position) {
                var pos = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
                
                playerMarker.setPosition(pos);
                panorama.setPosition(pos);
                map.setCenter(pos);
            
                if (!positionTracked) {
                    positionTracked = true;
                    game.start();
                } else {
                    game.positionUpdated();
                }

            }, function(error) {
                if (error.code == error.PERMISSION_DENIED)
                    alert("Non hai abilitato i permessi!");
                else
                    alert("Nessuna posizione rilevata.\n" + "[" + error.code + "] " + error.message);
            }, {
                enableHighAccuracy: true, 
                maximumAge        : 30000, 
                timeout           : 27000
            });
        } else {
            // Browser doesn't support Geolocation
            alert('Il tuo browser non supporta la geolocalizzazione!');
        }
        
    
        $('#show-player-stats').click(function() {showPlayerStats();});

        $('#health-image').click(function() { alert("Prova"); showLifeStats();});

        $('#btnUpgradeForm').click(function() {
            toggle_visibility('upgradeform');
        });
        
        $('#btnBuyHealth').click(function() {
            if (playerData['health'] < 100 && playerData['points'] >= healthPrice ) {
                playerData['points'] -= healthPrice;
                playerData['health'] += 25;
                updateHealthImage();
            } else if (playerData['points'] < healthPrice) {
                alert('Non hai abbastanza punti!');
            } else {
                alert('Sei già al massimo di vita!');
            }
        });
        $('#btnBuyPower').click(function() {
            if (playerData['points'] < powerPrice) {
                alert('Non hai abbastanza punti!\nContinua a fare report!');
                return;
            }
            
            if (playerData['power'] == 0) {
                playerData['points'] -= powerPrice;
                playerData['power'] = 25;
                powerPrice = 50;
                updateWeaponImage();
            } else if (playerData['power'] == 25) {
                playerData['points'] -= powerPrice;
                playerData['power'] = 50;
                powerPrice = 100;
                updateWeaponImage();
            } else if (playerData['power'] == 50) {
                playerData['points'] -= powerPrice;
                playerData['power'] = 100;
                updateWeaponImage();
            } else {
                alert('Sei già al massimo di potenza!');
            }
        });
        
        updateWeaponImage();
        updateHealthImage();
        $('#status-image').attr('src', playerData['sex'] == 'f' ? 'img/marker/player_female.png' : 'img/marker/player.png');
        
        //setInterval(mainLoop, 1000/FPS);
        lowLag.init();
        lowLag.load("fx/GUN_FIRE-GoodSoundForYou-820112263.mp3");
    },
    
    start : function() {
        game.createZombies();
        game.savePlayerDataAuto();
    },
    
    createZombies : function() {
        var newZombie;
        var i;
        zombiesTargetPosition = playerMarker.getPosition();
        for(i=0;i<totalZombies;i++) {
            if (zombies.length < totalZombies)
                newZombie = new Zombie();
            else
                newZombie = zombies[i+1];
            newZombie.spawn();
            newZombie.redirect();
            zombies.push(newZombie);
        }
    },
    
    recalculateZombiesDirections : function() {
        var i;
        for (i in zombies) {
            zombies[i].redirect();
        }
    },
    
    positionUpdated : function() {
        if (google.maps.geometry.spherical.computeDistanceBetween(zombiesTargetPosition, playerMarker.getPosition()) > 10) {
            zombiesTargetPosition = playerMarker.getPosition();
            game.recalculateZombiesDirections();
        }
    },
    
    toggleView : function() {
        var currCenter = map.getCenter();
        if ($("#map-canvas").hasClass('bigmap')) {
            $("#map-canvas").removeClass('bigmap');
            $("#map-canvas").addClass('minimap');
        } else {
            $("#map-canvas").removeClass('minimap');
            $("#map-canvas").addClass('bigmap');
        }
        google.maps.event.trigger(map, 'resize');
        map.setCenter(currCenter);
    },
    
    savePlayerDataAuto : function() {
        $.ajax({
            url: 'http://137.204.74.226/Geo-Zombie/index.php',
            type: 'POST',
            data: playerData
        }).always(function() {
            autosaveTimer = setTimeout(game.savePlayerDataAuto, 15000);
        });
    },
    
    resetPlayerData : function() {
        playerData['points'] = 0;
        playerData['power'] = 0;
        playerData['health'] = 100;
    },

    savePlayerData : function(repeat) {
        $.ajax({
            url: 'http://137.204.74.226/Geo-Zombie/index.php',
            type: 'POST',
            data: playerData
        });
    },
    
    isPanoramaView : function () {
        return !$("#map-canvas").hasClass('bigmap');
    }
}


function gameOver(zombPos){
    var i;
    for(i in zombies){
        if(!zombies[i].isDead()){
            zombies[i].stopMove();
        }
    }

    document.getElementById('blood').style.display='block';
    game.resetPlayerData();
    game.savePlayerData();
    
    if (confirm('Sei morto! Vuoi ricominciare?')) {
        document.getElementById('blood').style.display='none';
        updateWeaponImage();
        updateHealthImage();
        game.start(playerMarker.getPosition());
        //window.location.reload();
    }
}

function showPlayerStats() {
    isPaused = true;
    var stringa;
    if (playerData['power'] == 0)
        stringa = ' non hai nessuna arma!';
    else
        stringa = ' ' + playerData['power'];

    alert('Giocatore: ' + playerData['username'] + '\nPunti ottenuti facendo report: ' + playerData['points'] + '\n'+ 'Potenza dell\'arma:' + stringa);
    isPaused = false;
}


function showLifeStats() {
   var stringa;
   if(playerData['health'] != 100)
        stringa = '\nSe fai altri report puoi comprarne altra!';
   else
        stringa = '';
    alert('La tua vita è di: ' + playerData['health'] + stringa);
    isPaused = false;
}

function updateWeaponImage() {
    var img;
    if (playerData['power'] == 0)
        img = 'img/button/no_weapon.png';
    else if (playerData['power'] == 25)
        img = 'img/button/Beretta_93R.png';
    else if (playerData['power'] == 50)
        img = 'img/button/ACW_Rifle.png';
    else if (playerData['power'] == 100)
        img = 'img/button/sv_121_by_dalttt-d6mn5w3.png';
    $('#gun-image').attr('src', img);
}

function updateHealthImage() {
    var img;
    if (playerData['health'] == 0)
        img = 'img/button/heart_0.png';
    else if (playerData['health'] == 25)
        img = 'img/button/heart_25.png';
    else if (playerData['health'] == 50)
        img = 'img/button/heart_50.png';
    else if (playerData['health'] == 75)
        img = 'img/button/heart_75.png';
    else if (playerData['health'] == 100)
        img = 'img/button/heart_100.png';
    $('#health-image').attr('src', img);
}

function flash() {
    document.getElementById('flash-fx').style.display='block';
    setTimeout(function() { document.getElementById('flash-fx').style.display='none'; }, 250);
}

$( game.init );