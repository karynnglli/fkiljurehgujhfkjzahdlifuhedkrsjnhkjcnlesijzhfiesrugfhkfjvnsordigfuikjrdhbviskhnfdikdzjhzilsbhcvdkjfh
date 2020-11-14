const messagesInChat = document.getElementById("messages"); //used for scrolling to the bottom when a new message is posted

//Creates the sound when a button is clicked
var mouseDown = new Audio("sounds/mouseDown.mp3"); //when you press down on the transmit button
var mouseUp = new Audio("sounds/mouseUp.mp3"); //when you release the transmit button
var newMessage = new Audio("sounds/newMessage.mp3"); //when a different user sends a message
var badCommand = new Audio("sounds/badCommand.mp3"); //when a bad command is issued by the user
var badColorFormat = new Audio("sounds/badColorFormat.mp3"); //when a bad command is issued by the user
var badUsername = new Audio("sounds/badUsername.mp3"); //when a user name is already being used by another user
var doNotAddressThisUnitInThatManner = new Audio("sounds/doNotAddressThisUnitInThatManner.mp3"); //when the user abuses the the system with profanity
var warning = new Audio("sounds/warning.mp3"); //when the user abuses the the system with profanity

$(function ()
{
	var socket = io();
	
	/* Cookies */
	var cookieName = Cookies.get("name");
	var cookieColor = "000000";
	
	//When user presses the transmit button
	$("form").submit(function(e)
	{
		// prevents page reloading
		e.preventDefault();
		
		//save the user's input for "processing"
		let userInput = $("#m").val();
		
		//if /name command is given
		if(userInput.substring(0,5) === "/name" && userInput.length >= 7 && userInput.substring(5,6) === " " && userInput[6] != " ")
		{
			//If in proper format
			socket.emit("change username", userInput);
		}
		//if /color command is given
		else if(userInput.substring(0,6) === "/color" && userInput.length == 13)
		{
			//major help from: https://www.w3resource.com/javascript/form/all-numbers.php#:~:text=size%3A%2010pt%3B%20%7D-,To%20check%20for%20all%20numbers%20in%20a%20field,expression%20against%20the%20input%20value.
			var numbers = /^[0-9ABCDEFabcdef]+$/;
			
			if(userInput.substring(7,13).match(numbers))
			{
				socket.emit("update user color", userInput.substring(7,13));																//update the socket.color
				Cookies.set("color", userInput.substring(7,13), {expires: 7}, {sameSite: "strict"});										//add the cookie color to the user's cookie
				$("#messages").append($("<li style='color:#" + userInput.substring(7,13) + ";'>").html("<b><i>Color Changed!</i></b>"));
				messagesInChat.scrollTop = messages.scrollHeight + messagesInChat.scrollTop;												//scrolls to the bottom (aka the new message) when a new mssage is posted
			}
			else
			{
				badColorFormat.play();
				$("#messages").append($("<li style='color:yellow;'>").html("<b><i>Error! '" + $("#m").val() + "' is an invalid format. Only six digit numbers, like '/color 123456' are valid. Please try again...</i></b>"));
				messagesInChat.scrollTop = messages.scrollHeight + messagesInChat.scrollTop;												//scrolls to the bottom (aka the new message) when a new mssage is posted
			}
		}
		else if(userInput.substring(0,6) === "/bitch" || userInput.substring(0,8) === "/asshole" || userInput.substring(0,5) === "/fuck" || userInput.substring(0,4) === "/die" || userInput.substring(0,5) === "/shit" || userInput.substring(0,13) === "/motherfucker" || userInput.substring(0,5) === "/cunt")
		{
			doNotAddressThisUnitInThatManner.play();
		}
		else if(userInput.substring(0,1) === "/")
		{
			//if bad command is given
			badCommand.play();
			$("#messages").append($("<li style='color:red;'>").html("<b><i>Error! '" + $("#m").val() + "' is an invalid command. Only '/name usernameNotTakenYet' and '/color 123456' are valid commands!</i></b>"));
			messagesInChat.scrollTop = messages.scrollHeight + messagesInChat.scrollTop;												//scrolls to the bottom (aka the new message) when a new mssage is posted
		}
		else if(userInput.substring(0,1) != "/")
		{
			//if no / command, then do the regular send
			socket.emit("chat message", $("#m").val());
		}
		$("#m").val("");																													//clears the user's input form field after transmitting their message
		return false;
	});
	
	//When "user color" has been emitted, this picks it up and gets the color from cookies. If nothing set, put in the default
	socket.on("user color", color =>
	{
		var cookieColor = Cookies.get("color");
		if (cookieColor === undefined)
		{
			Cookies.set("color", color, {expires: 7}, {sameSite: "strict"});
		}
		else
		{
			socket.emit("update user color", cookieColor);
		}
	});
	
	//When "server assigned username" has been emitted, this picks it up and deals with the username.
	//Deal with username. If there is no cookie with username in it, then use the default provided by the server and store it in the cookie.
	//However, if there is a cookie with a username in it, then use that instead.
	socket.on("server assigned username", username =>
	{
		if (cookieName === undefined)
		{
			Cookies.set("name", username, {expires: 7}, {sameSite: "strict"});
			cookieName = Cookies.get("name");
			alert("Welcome to StarChat " + cookieName + ".\nYou can change your username with:\n          /username newAndUniqueUsername");
		}
		else
		{
			//Cookies.set("username", username, {expires: 7}, {sameSite: "strict"});
			alert("Welcome back to StarChat, " + cookieName);
		}
		socket.emit("add username", cookieName);
	});
	
	//When "update cookieName" has been emitted, this picks it up and updates the cookie with the new username
	socket.on("update cookieName", updatedUsername =>
	{
		Cookies.set("name", updatedUsername, {expires: 7}, {sameSite: "strict"});
	});
	
	//When "bad username" has been emitted, this picks it up and sends the message to the user only and to no one else and does not go into history
	socket.on("bad username", updatedUsername =>
	{
		$("#messages").append($("<li style='color:orange;'>").html("<b><i>Duplicate Username Error! There is already a user with '" + updatedUsername + "' as their username (or you already have it). Please choose another username...</i></b>"));
		messagesInChat.scrollTop = messages.scrollHeight + messagesInChat.scrollTop;												//scrolls to the bottom (aka the new message) when a new mssage is posted
		badUsername.play();
	});
	
	//When "username taken" has been emitted, this picks it up and  sends the message to the user only and to no one else and does not go into history
	socket.on("username taken", serverAlert =>
	{
		$("#messages").append($("<li style='color:white;'>").html("<b><i>" + serverAlert + "</i></b>"));
		warning.play();
	});
	
	//When "show username" has been emitted, this picks it up and displays user's name in the title area
	//For displaying the username in the "Hello..."
	socket.on("show username", function(name)
	{
		$("#user").empty(); //always clear the list, just incase it is not a refresh and instead it is a time out and then reconnect.
		//$("#user").append($("<li>").text("You are " + name)); //now, with a guaranteed clear list, we can put the user's name in the title
		$("#user").append($(name)); //puts new message into the chat window
	});
	
	//Update the user list		
	
	//When "clear user list" has been emitted, this picks it up and erases the users lists first
	socket.on("clear user list", function(NotUsedOrNeededDummyVariable)
	{
		$("#userList").empty();
	});
	//When "update user list" has been emitted, this picks it up and then re-populates it
	socket.on("update user list", function(user)
	{
		$("#userList").append($("<li>").text(user));					//updates the user list
	});
	
	//End of updating the user list
	
	//When "chat message" has been emitted, this picks it up and send post the message
	socket.on("chat message", function(msg)
	{
		if(msg !== "" || " ")
		{
			$("#messages").append($(msg)); //puts new message into the chat window
			
			//To deal with chrome's ridiculousness from https://developers.google.com/web/updates/2017/06/play-request-was-interrupted
			//Try to play sound
			var playPromise = newMessage.play();

			if (playPromise !== undefined)
			{
				playPromise.then(_ =>{
					//sound played
				})
				.catch(error =>	{
					//sound not played
				});
			}
			messagesInChat.scrollTop = messages.scrollHeight + messagesInChat.scrollTop; //scrolls to the bottom (aka the new message) when a new mssage is posted
		}
	});
});

//when your mouse hovers over the transmit button
function playSoundDown()
{
	//To deal with chrome's ridiculousness from https://developers.google.com/web/updates/2017/06/play-request-was-interrupted
	//Try to play sound
    var playPromise = mouseDown.play();

	if (playPromise !== undefined)
	{
		playPromise.then(_ =>{
			//Sound played
		})
		.catch(error =>	{
			//Sound not played
		});
	}
 };

//when you mousedown on the transmit button
function playSoundUp()
{
    var playPromise = mouseUp.play();
};
