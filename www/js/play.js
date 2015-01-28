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
var zombieVisibleRadius = 200;
var zombiesInVisibleRadius = 0;
var dieRadius = 1;

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
        streetView : panorama,
    };
    
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

    // Try HTML5 geolocation
    if(navigator.geolocation) {
        gpsTracker = navigator.geolocation.watchPosition(function(position) {
            var pos = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);

            if (playerMarker === null)
            {
                // Place player's marker
                playerMarker = new google.maps.Marker({
                  position: pos,
                  map: map,
                  icon: 'img/marker/player.png',
                });
                
                playerMarker.circle = new google.maps.Circle({
                    map: map,
                    center: playerMarker.getPosition(),
                    radius: zombieVisibleRadius,
                });
                
                playerMarker.circle.bindTo('center', playerMarker, 'position');

                map.setCenter(pos);
                startGame(pos);
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
    var smallAnchorY = 37.3;
    var bigAnchorY = 210;
    var smallSizeW = 13.9;
    var smallSizeH = 37.3;
    var bigSizeW = 139;
    var bigSizeH = 373;
    var imgW = 139;
    var imgH = 373;
    var gotKill = false;

    var smallMult = 0.05;
    var anchorMult = 0.4;

    var zombieSprites = [
        {
            file:'img/zombie/zombie1.png',
            width:244,
            height:708,
            speed: 1,
            anchorMult:0.3
        },
        {
            file:'img/zombie/zombie2.png',
            width:437,
            height:664,
            speed: 1,
            anchorMult:0.4
        },
        {
            file:'img/zombie/zombie3.png',
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

    var closeImage = new google.maps.MarkerImage(curSprite.file,
        new google.maps.Size(curSprite.width,curSprite.height),
        new google.maps.Point(0,0),
        new google.maps.Point(curSprite.width/2,curSprite.height*anchorMult),
        new google.maps.Size(curSprite.width,curSprite.height)
    );

    var mapSprite = new google.maps.Marker({
        position:pos,
        map:map,
        title:"zombie"
    });
    var svSprite = new google.maps.Marker({
        position:pos,
        map:panorama,
        title:"zombie",
        visible:false,
        icon:image,
        clickable:false
    });
   
   
    function getDir(){
         var dirReq = {
            origin:mapSprite.getPosition(),
            destination: playerMarker.getPosition(),
            travelMode: google.maps.DirectionsTravelMode.WALKING
        };
        dirService.route(dirReq,gotDir);
    }

    function gotDir(result,status){
        if(status == google.maps.DirectionsStatus.OK){
            route = result.routes[0].overview_path;
            if(imNew){
                setPos(route.shift());
                imNew=false;
            }else{
                route[0]=getPos();
            }
        }
    }

    function redirect(){
      getDir();
    }
    
    function setPos (pos){
       mapSprite.setPosition(pos);
       svSprite.setPosition(pos);
       var dist = google.maps.geometry.spherical.computeDistanceBetween(getPos(),playerMarker.getPosition());
       
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
                svSprite.setIcon(newImage);

                if(!gotKill){
                    gotKill=true;
                    gameOver(getPos());
                    
                }
       }
       
       if(dist<dieRadius){
           stopMove();
            gameOver(getPos());
        }
        
        // Uno zombie è dentro la visuale
        if(dist<=zombieVisibleRadius){
            zombiesInVisibleRadius++;
            panorama.setVisible(true);
            svSprite.setVisible(true);
            toggleView();
            playerMarker.circle.setOptions({
                strokeColor: 'red',
                fillColor: 'red'
            });
        }
    }
    function getPos (){
        return mapSprite.getPosition();
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
        svSprite.setVisible(false);
    }

    function move() {
        var newZombPos;
        if (route.length>0) {
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
    function getKillStatus(){
        return gotKill;
    }
    
    // 
    function die() {
        zombiesInVisibleRadius--;
        if (zombiesInVisibleRadius == 0) {
            toggleView();
        }
    }

    return{
        getPos:getPos,
        startMove:startMove,
        stopMove:stopMove,
        redirect:redirect,
        getKillStatus:getKillStatus
    };

}

function toggleView()
{
    if ($("#map-canvas").hasClass('bigmap')) {
        $("#map-canvas").removeClass('bigmap');
        $("#map-canvas").addClass('minimap');
    } else {
        $("#map-canvas").removeClass('minimap');
        $("#map-canvas").addClass('bigmap');     
    }
    map.setCenter(playerMarker.getPosition());
}

///////////

function startGame(loc){
    startLoc = loc;
    updateTimer();

            totalZombies = 70;

    /*var mapOps = {
        zoom:15,
        mapTypeId:google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        center:startLoc,
        minZoom:13,
        streetViewControl:false,
        draggable:false,
        mapTypeControl:false
        
    };
    dirService = new google.maps.DirectionsService();
    dirDisplay = new google.maps.DirectionsRenderer();
    //mapDiv.style.display = "block";
    //svDiv.style.display = "block";
    //document.getElementById('startup').style.display='none';
    //document.getElementById('play').style.display='block';
    map = new google.maps.Map(mapDiv,mapOps);
    var svOpts = {
        position : startLoc,
        zoomControl:false,
        scrollwheel:false,
        disableDoubleClickZoom:true

    };
    sv = new google.maps.StreetViewPanorama(svDiv,svOpts);
    map.setStreetView(sv);
    google.maps.event.addListener(sv,'position_changed',svPosChange);*/
    createZombies();
}

function gameOver(zombPos){
    var i;
    for(i in zombies){
        if(!zombies[i].getKillStatus()){
            zombies[i].stopMove();
        }
    }
    clearInterval(timeInt);
    var heading = google.maps.geometry.spherical.computeHeading(sv.getPosition(),zombPos);
    var curHeading = sv.getPov().heading;
    if(heading - curHeading<0){
        aniAmt*=-1;
    }
    aniPov(heading);
    document.getElementById('blood').style.display='block';
}

function aniPov(dest){
    aniFinish = dest;
    povAniInt = setInterval(aniPovStep,33);
}

function aniPovStep(){
    var curPov = sv.getPov();
    var newHeading = curPov.heading + aniAmt;
    if(newHeading>=aniFinish-Math.abs(aniAmt) && newHeading<=aniFinish+Math.abs(aniAmt)){
        clearInterval(povAniInt);
        newHeading = aniFinish;
        console.log('ani done');
        setTimeout(showEnd,2000);
    }
    sv.setPov({
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
    document.getElementById('gametime').innerHTML = min+" minutes and "+sec+" seconds";
    document.getElementById('gameover').style.display='block';
}

$( initialize );