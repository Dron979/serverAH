var http = require('http');
var Static = require('node-static');
var WebSocketServer = new require('ws');
var clients = {};
var balls = {};

function Ball(){
	var ID = "ball";
	var RADIUS = 25;
	var HOME_POS_X = 500;
	var HOME_POS_Y = 250;
	this.pos_x = HOME_POS_X;
	this.pos_y = HOME_POS_Y;
	var move_y = 0;
	var move_x = 0;
	var move_speed = 1;
	this.count_coll = 0; 
	this.setMoveSpeed = function(speed){
		move_speed = 1 + (100 - speed) / 50000;
	};
	this.setMoveX = function(x){
		move_x = x;
	};
	this.setMoveY = function(y){
		move_y = y;
	};
	this.getMoveX = function(){
		return move_x;
	};
	this.getMoveY = function(){
		return move_y;
	};
	this.getRadius = function(){
		return RADIUS;
	};
	this.goHome = function(){
		move_y = 0;
		move_x = 0;
		this.pos_x = HOME_POS_X;
		this.pos_y = HOME_POS_Y;
	};
	this.drawBall = function(){
		this.pos_y = this.pos_y + move_y;
		this.pos_x = this.pos_x + move_x;
		var str = this.pos_x + "+" + this.pos_y + "|"
		this.count_coll = 0;
		move_y /= move_speed;
		move_x /= move_speed;
		if(Math.round(move_y)==0 || Math.round(move_x)==0){
			move_y = 0;
			move_x = 0;
		};
		return str;
	};
};

function collision(plr1_posX, plr1_posY, plr1_speed, plr2_posX, plr2_posY, plr2_speed, key){
	if((Math.sqrt(Math.pow(Math.abs(plr1_posX - balls[key].ball.pos_x), 2) + Math.pow(Math.abs(plr1_posY - balls[key].ball.pos_y), 2)) <= 60) && !balls[key].ball.count_coll){
		balls[key].ball.setMoveX((balls[key].ball.pos_x - plr1_posX) / 10);
		balls[key].ball.setMoveY((balls[key].ball.pos_y - plr1_posY) / 10);
		balls[key].ball.setMoveSpeed(plr1_speed);
	};
	if((Math.sqrt(Math.pow(Math.abs(plr2_posX - balls[key].ball.pos_x), 2) + Math.pow(Math.abs(plr2_posY - balls[key].ball.pos_y), 2)) <= 60) && !balls[key].ball.count_coll){
		balls[key].ball.setMoveX((balls[key].ball.pos_x - plr2_posX) / 10);
		balls[key].ball.setMoveY((balls[key].ball.pos_y - plr2_posY) / 10);
		balls[key].ball.setMoveSpeed(plr2_speed);
	};
	if(((balls[key].ball.pos_y - balls[key].ball.getRadius() <= 2) || ((balls[key].ball.pos_y + balls[key].ball.getRadius()) >= 498)) && !balls[key].ball.count_coll){
		balls[key].ball.count_coll++;
		balls[key].ball.setMoveY((balls[key].ball.getMoveY()) * (-1));
	};
	
	if(((balls[key].ball.pos_x - balls[key].ball.getRadius() <= 2) || ((balls[key].ball.pos_x + balls[key].ball.getRadius()) >= 998)) && !balls[key].ball.count_coll){
		balls[key].ball.count_coll++;
		if((balls[key].ball.pos_y + balls[key].ball.getRadius() <= 350) && (balls[key].ball.pos_y - balls[key].ball.getRadius() >= 150) && ((balls[key].ball.pos_x - balls[key].ball.getRadius() <= 2) || (balls[key].ball.pos_x + balls[key].ball.getRadius() >= 998))){
			balls[key].ball.goHome();
		}
		else{
			balls[key].ball.setMoveX((balls[key].ball.getMoveX()) * (-1));
		};
	};
	
};

setInterval(function(){
	for(key in balls){
		var values = {};
		var number = 0;
		for(client in balls[key].rivals){
			values[number++] = +balls[key].rivals[client].strMove.slice(0, balls[key].rivals[client].strMove.indexOf("+"));
			balls[key].rivals[client].strMove = balls[key].rivals[client].strMove.substring(balls[key].rivals[client].strMove.indexOf("+")+1);
			values[number++] = +balls[key].rivals[client].strMove.slice(0, balls[key].rivals[client].strMove.indexOf("|"));
			balls[key].rivals[client].strMove = balls[key].rivals[client].strMove.substring(balls[key].rivals[client].strMove.indexOf("|")+1);
		    values[number++] = Math.sqrt(Math.pow(Math.abs(balls[key].rivals[client].posX - values[number - 3]), 2) + Math.pow(Math.abs(balls[key].rivals[client].posY - values[number - 2]), 2));
		    if((values[number - 3] > 0) && (values[number - 2] > 0)){
				balls[key].rivals[client].posX = values[number - 3];
				balls[key].rivals[client].posY = values[number - 2];
			};
		};
		number = 0;
		collision(values[number++], values[number++], values[number++], values[number++], values[number++], values[number++], key);
		balls[key].strMoveBall += balls[key].ball.drawBall();
	};
}, 10);

setInterval(function(){
	for(key in balls){
		balls[key].strMoveBall += ':ballMove';
		for(client in balls[key].rivals){
			if('webSocket' in balls[key].rivals[client])
			balls[key].rivals[client].webSocket.send(balls[key].strMoveBall);
		};
		balls[key].strMoveBall = '';	
	};
}, 100);

var id = 0;

var webSocketServer = new WebSocketServer.Server({port: 8081});

webSocketServer.on('connection', function(ws) {
	console.log("Server: новое подключение");	
	var login;
	var rival;
	var myId;
	ws.on('message', function(message) {
        if(message.indexOf('login') + 1){
			login = message.slice(message.indexOf('login=') + 6, message.indexOf('&&'));
			rival = message.slice(message.indexOf('&&rival=') + 8);
			clients[login] = ws;
			console.log('Server: новый пользователь ' + login);
			var flag = 0;
			for(key in balls){
				if(login in balls[key].rivals){
					flag++;
					myId = key;
					balls[myId].rivals[login].webSocket = ws;
				};
			};			
			if(!flag){
				myId = id;
				balls[id] = {};
				balls[id].rivals = {};
				balls[id].rivals[login] = {};
				balls[id].rivals[login].webSocket = ws;
				balls[id].rivals[login].strMove = '';
				balls[id].rivals[login].posX;
				balls[id].rivals[login].posY;
				balls[id].rivals[rival] = {};
				balls[id].rivals[rival].strMove = '';
				balls[id].rivals[rival].posX;
				balls[id].rivals[rival].posY;
				balls[id].ball = new Ball();
				balls[id++].strMoveBall = '';
			};
		}
	   else{
		   if(rival in clients){
			   console.log(login + '->' + rival + ': ' + message);
			   balls[myId].rivals[login].strMove += message;
			   message += ":rivalMove";
			   clients[rival].send(message);
		   };
	   };
    });
	
    ws.on('close', function() {
        console.log('Server: соединение закрыто ' + login);
        delete clients[login];
		console.log('Server: клиент ' + login + ' удален');
		if(myId in balls){
			console.log('Server: ball ' + myId + ' удален');
			delete balls[myId];
		};
    });
});

var fileServer = new Static.Server('.');
http.createServer(function (req, res){
  fileServer.serve(req, res);
}).listen(8080);

console.log("Server: сервер запущен на порте 8080, WebSocket на 8081.");