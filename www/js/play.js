var map, panorama, gpsTracker;
var dirService;
var playerMarker = null;
var zombies = [];
var timeSpent = 0;
var totalMoves = 0;
var playerBuffer = 180;
var timeInt;
var FPS = 5;
var fpsInt = 1000/FPS;
var zombieMoveDist = 0.00001;
var zombieDistributionRange = 3800;
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
var healthPrice = 5;
var powerPrice = 5;

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


function initialize() {
    
    // Initialize Google Maps and Street View
    dirService = new google.maps.DirectionsService();
    
    var panoramaOptions = {
        visible: false,
        disableDefaultUI: true,
    };
    
    panorama = new google.maps.StreetViewPanorama(document.getElementById('pano-canvas'), panoramaOptions);

    var mapOptions = {
        zoom: 16,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: true,
        draggable: false,
        disableDoubleClickZoom: true,
        streetView : panorama,
    };
    
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

    // Try HTML5 geolocation
    if(navigator.geolocation) {
        gpsTracker = navigator.geolocation.watchPosition(function(position) {
            var pos = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);

            if (playerMarker === null)
            {
                playerData = JSON.parse(localStorage['data']);
                
                var playerIcon = new google.maps.MarkerImage(
                    playerData['sex'] == 'f' ? 'img/marker/player_female.png' : 'img/marker/player.png',
                    null, /* size is determined at runtime */
                    null, /* origin is 0,0 */
                    null, /* anchor is bottom center of the scaled image */
                    new google.maps.Size(62, 68)
                );  
                // Place player's marker
                playerMarker = new google.maps.Marker({
                  position: pos,
                  map: map,
                  icon: playerIcon,
                });
                
                playerMarker.circle = new google.maps.Circle({
                    map: map,
                    center: playerMarker.getPosition(),
                    radius: zombieVisibleRadius,
                });
                
                playerMarker.circle.bindTo('center', playerMarker, 'position');
                map.bindTo('center', playerMarker, 'position');

                map.setCenter(pos);
                startGame(pos);
                
                updateWeaponImage();
                updateHealthImage();
                // set interval
                var tid = setInterval(savePlayerData, 15000);
            }
            playerMarker.setPosition(pos);
            panorama.setPosition(pos);
            positionUpdated();


        }, function() {
            alert("Nessuna posizione rilevata.");
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
            alert('Non hai abbastanza punti!');
            return;
        }
        
        if (playerData['power'] == 25) {
            playerData['points'] -= powerPrice;
            playerData['power'] = 50;
            updateWeaponImage();
        } else if (playerData['power'] == 50) {
            playerData['points'] -= powerPrice;
            playerData['power'] = 100;
            updateWeaponImage();
        } else {
            alert('Sei già al massimo di potenza!');
        }
    });
}

function toggle_visibility(id) {
   var e = document.getElementById(id);
   isPaused = !isPaused;
   if(e.style.display == 'block')
      e.style.display = 'none';
   else
      e.style.display = 'block';
}

function resetPlayerData() {
    playerData['points'] = 0;
    playerData['power'] = 25;
    playerData['health'] = 100;
}

function savePlayerData() {
    $.ajax({
        url: 'http://robotex.altervista.org/tesi/index.php',
        type: 'POST',
        data: playerData
    }).done(function( data ) {
        //if (data == 'Not authenticated') { // Refresh authentication
        //}
    });
}

function positionUpdated(){
    if( totalMoves>1 && !timeInt){
        timeInt = setInterval(updateTimer,1000);
    }
    totalMoves++;
    if(totalMoves%3==0 || totalMoves<3){
        checkZombies();
    }
    map.setCenter(playerMarker.getPosition());
    timeSinceMove = 0;
}

function updateTimer(){
    timeSpent++;
    var min = Math.floor(timeSpent/60).toString();
    var sec = Math.round(timeSpent%60).toString();
    if(min.length<2){
        min = "0"+min;
    }
    if(sec.length<2){
        sec = "0"+sec;
    }
    //document.getElementById("timer").innerHTML = "TIME ALIVE: <strong>"+min+":"+sec+"</strong>";
    /*if(timeSinceMove>4){
        checkZombies();
        timeSinceMove = 0;
    }*/
}

function createZombies(){
    var heading;
    var dist;
    var center = playerMarker.getPosition();
    var newZombie;
    var i;
    for(i=1;i<=totalZombies;i++){
        heading = Math.random()*360;
        dist = playerBuffer + (Math.random()*(zombieDistributionRange-playerBuffer));
        newZombie = new Zombie(google.maps.geometry.spherical.computeOffset(center,dist,heading));

        zombies.push(newZombie);
    }
}

function checkZombies(){
    var zom;
    var dist;
    redirects = 0;
    var i;
    for(i in zombies){
        zom = zombies[i];
        dist = google.maps.geometry.spherical.computeDistanceBetween(zom.getPos(),playerMarker.getPosition());
        if(dist<zombieAwareRadius){
            redirects++;
            if(redirects<80){
                zom.redirect();
            }
            zom.startMove();
        }else if(dist>zombieAsleepRadius){
            zom.stopMove();
        }
    }
}

// Zombie object
function Zombie(pos){
    var route;
    var moveInt;
    var imNew = true;
    //var smallAnchorY = 37.3;
    //var bigAnchorY = 210;
    //var smallSizeW = 13.9;
    //var smallSizeH = 37.3;
    //var bigSizeW = 139;
    //var bigSizeH = 373;
    var imgW = 139;
    var imgH = 373;

    var health = 100; // Zombie's health

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
            map:map,
            title:"zombie",
            icon:'img/marker/zombie.png'
        });
    var panoramaMarker = new google.maps.Marker({
            map:panorama,
            title:"zombie",
            visible:false,
            icon:image,
            clickable:true
        });
    
    
    // 
    init(pos);
    
    function init(pos) {

        mapMarker.setPosition(pos);
        panoramaMarker.setPosition(pos);
        
        google.maps.event.addListener(panoramaMarker, 'click', function() {
            hit();
        });
        
        setVisible(true);
    }


    // Get directions to player
    function getDir(){
         var dirReq = {
            origin:mapMarker.getPosition(),
            destination: playerMarker.getPosition(),
            travelMode: google.maps.DirectionsTravelMode.WALKING
        };
        dirService.route(dirReq,function(result,status){
            if(status == google.maps.DirectionsStatus.OK){
                route = result.routes[0].overview_path;
                if(imNew){
                    setPos(route.shift());
                    imNew=false;
                }else{
                    route[0]=getPos();
                }
            }
        });
    }

    function redirect(){
      getDir();
    }
    
    function setPos (pos){
       mapMarker.setPosition(pos);
       panoramaMarker.setPosition(pos);
       var dist = google.maps.geometry.spherical.computeDistanceBetween(getPos(),playerMarker.getPosition());
       /*
       if(dist<5){
           var pct = 1-((dist-dieRadius)/(5-dieRadius));
           var expPct = 1.001*-Math.pow(3,-3 * pct)+1;
           var newHeight = (curSprite.height*smallMult) + ((curSprite.height-(curSprite.height*smallMult))*expPct);
           var newWidth = (curSprite.width*smallMult) + ((curSprite.width-(curSprite.width*smallMult))*expPct);
           var newImage = new google.maps.MarkerImage(curSprite.file,
                new google.maps.Size(curSprite.width,curSprite.height),
                new google.maps.Point(0,0),
                new google.maps.Point(newWidth/2, newHeight * curSprite.anchorMult ),
                new google.maps.Size(newWidth,newHeight)
            );
                panoramaMarker.setIcon(newImage);

                if(!isDead()){
                    health = 0;
                    gameOver(getPos());
                    
                }
       }*/
       
       if(dist<dieRadius){
            respawn();
            playerData['health'] = playerData['health'] - 25;
            updateHealthImage();
            if (playerData['health'] <= 0) {
                stopMove();
                gameOver(getPos());
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
                toggleView();
            }
            zombiesInVisibleRadius = true;
            panoramaMarker.setVisible(true);
        }
    }
    function getPos (){
        return mapMarker.getPosition();
    }

    function startMove(){
        if(route && !moveInt){
            moveInt = setInterval(move,fpsInt);
        }
       
    }
    function stopMove(){
        if(moveInt){
            clearInterval(moveInt);
            moveInt = null;
        }
        panoramaMarker.setVisible(false);
    }

    function move() {
        var newZombPos;
        if (route.length>0) {
            if (isPaused)
                return;
            if (getPos()==route[0]) {
                route.shift();
            }
            if (route[0]) {
                var nextX = route[0].lat();
                var nextY = route[0].lng();
                var zombieX = getPos().lat();
                var zombieY = getPos().lng();
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
               setPos(newZombPos);
            }
        }
        else
        {
            clearInterval(moveInt);
        }
    }
    
    // 
    function setVisible(flag) {
        mapMarker.setVisible(flag);
        panoramaMarker.setVisible(flag && isPanoramaView ? flag : !flag);
    }
    
    function isInPlayerVisibleRadius() {
        return (google.maps.geometry.spherical.computeDistanceBetween(mapMarker.getPosition(), playerMarker.getPosition()) <= zombieVisibleRadius);
    }
    
    function respawn() {
        var center = playerMarker.getPosition();
        var heading = Math.random()*360;
        var dist = playerBuffer + (Math.random()*(zombieDistributionRange-playerBuffer));
        init(google.maps.geometry.spherical.computeOffset(center,dist,heading));
    }
    
    function hit() {
        var audio = new Audio('fx/GUN_FIRE-GoodSoundForYou-820112263.mp3');
        audio.play();
        health = health - playerData['power'];
        if (isDead()) {
            respawn();
            
            zombiesInVisibleRadius = zombies.some(function(element, index, array) {
                return element.isInPlayerVisibleRadius();
            });
            
            if (zombiesInVisibleRadius == false) {
                playerMarker.circle.setOptions({
                    strokeColor: 'black',
                    fillColor: 'black'
                });
                toggleView();
                panorama.setVisible(false);
            }
        }
    }
    
    function isDead() {
        if (health <= 0) {
            return true;
        } else {
            return false;
        }
    }

    return {
        getPos:getPos,
        startMove:startMove,
        stopMove:stopMove,
        redirect:redirect,
        isDead:isDead,
        isInPlayerVisibleRadius:isInPlayerVisibleRadius
    };

}

function isPanoramaView() {
    return !$("#map-canvas").hasClass('bigmap');
}

function toggleView()
{
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
}

///////////

function startGame(loc){
    startLoc = loc;
    updateTimer();

    totalZombies = 70;
            
    createZombies();
}

function gameOver(zombPos){
    var i;
    for(i in zombies){
        if(!zombies[i].isDead()){
            zombies[i].stopMove();
        }
    }
    clearInterval(timeInt);
    var heading = google.maps.geometry.spherical.computeHeading(panorama.getPosition(),zombPos);
    var curHeading = panorama.getPov().heading;
    if(heading - curHeading<0){
        aniAmt*=-1;
    }
    //aniPov(heading);
    document.getElementById('blood').style.display='block';
    resetPlayerData();
    savePlayerData();
    if (confirm('Sei morto! Vuoi ricominciare?')) {
        document.getElementById('blood').style.display='none';
        updateWeaponImage();
        updateHealthImage();
        startGame(playerMarker.getPosition());
    }
}

function aniPov(dest){
    aniFinish = dest;
    povAniInt = setInterval(aniPovStep,33);
}

function aniPovStep(){
    var curPov = panorama.getPov();
    var newHeading = curPov.heading + aniAmt;
    if(newHeading>=aniFinish-Math.abs(aniAmt) && newHeading<=aniFinish+Math.abs(aniAmt)){
        clearInterval(povAniInt);
        newHeading = aniFinish;
        //console.log('ani done');
        setTimeout(showEnd,2000);
    }
    panorama.setPov({
        heading:newHeading,
        zoom:curPov.zoom,
        pitch:0
    });
}

function showEnd(){
    var min = Math.floor(timeSpent/60).toString();
    var sec = Math.round(timeSpent%60).toString();
    if(min.length<2){
        min = "0"+min;
    }
    if(sec.length<2){
        sec = "0"+sec;
    }
    //document.getElementById('gametime').innerHTML = min+" minutes and "+sec+" seconds";
    //document.getElementById('gameover').style.display='block';
}

function showPlayerStats() {
    isPaused = true;
    alert('Giocatore: ' + playerData['username'] + '\nPunti: ' + playerData['points'] + '\nForza: ' + playerData['power']);
    isPaused = false;
}

function updateWeaponImage() {
    var img;
    if (playerData['power'] == 25)
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

$( initialize );