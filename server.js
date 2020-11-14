//edited package.json to include the following:
//	"scripts":
//	{
//		"start": "node server.js",
//		"dev": "nodemon server.js"
//	}
//this allows one to run as dev which will auto reload all js when changed (by utilizing nodemon which was also added as a package)
//
//To run in dev environment:
//					npm run dev
//To run as regular:
//					npm run start

var express = require("express");
const app = express();
var path = require("path");
var http = require("http").createServer(app);
var io = require("socket.io")(http);

app.use(express.static("client"));			//to use css file in the client folder

var numberOfUsers = 0;						//to count how many users there are
var username = "";							//for the user when the user accesses the site
var userNumber = 0;
let listOfUsers = [];						//to show the usernames

var time = new Date();						//for time stamp

let chatHistory = [];						//for chat history

//var io = require("socket.io")(https);

app.get("/", (req, res) => //req = request, res = response
{
	res.sendFile(__dirname + "/client/index.html"); //res = response
});

//The .on is a listener for an event whenever a user joins
io.on("connection", (socket) =>
{
	//When a new user connects
	numberOfUsers++;
	
	socket.on("update user color", (updatedColor) =>
	{
		socket.color = updatedColor;
	});

		//When a user connects, see if they have already visited us and have set a different color
		//If they do not have a color different than 000000, client.js will not do anything.
		//If they do have a color different than 000000, client.js will call upon "update user color"
		socket.color = "000000"
		socket.emit("user color", socket.color);
		
		//When a new user connects, send them the chat history
		var chatLength = chatHistory.length;
		for(let i = 0; i < chatLength; i++)
		{
			socket.emit("chat message", (chatHistory[i]).bold());
		};
	
		//When a user connects, they are assigned a unique username
		socket.username = "user" + String(userNumber++);			//needed when disconnecting and posting messages
		socket.emit("server assigned username", socket.username);
		
		//When a new user connects, we go through a process by which we get the usermame in the client.js
		//Once client.js sends us the username to server.js here, we add it to the list and update it to all users
		socket.on("add username", (cookieName) =>
		{
			//Check to see if there already is a user in the listOfUsers array
			var alreadyInList = false;
			var listOfUsersLength = listOfUsers.length;
			for(let i = 0; i < listOfUsersLength; i++)
			{
				//check to see if the user already exists in the list
				if(listOfUsers[i] != cookieName)
				{
					//not match, so don't do anything
				}
				else
				{
					alreadyInList = true;
				}
			}
			if(alreadyInList == true)
			{
				//If there already exists a user, let the user know and 
				listOfUsers.push(socket.username);																//add username to listOfUsers array
				coloredNameChange = "<li style='color:#" + socket.color + ";'>" + "You are " + socket.username;
				socket.emit("show username", coloredNameChange.bold());
				socket.emit("update cookieName", socket.username);												//Update the user's cookies
				socket.emit("username taken", "Your username '" + cookieName + "' was taken while you were away. Your new username is '" + socket.username + "'.") //let the user know
			}
			else
			{
				//If no such user in the listOfUsers array, then add the cookieName to the listOfUsers array, set the socket.username to cookieName and update everyone's Users area
				listOfUsers.push(cookieName);																	//add username to listOfUsers array
				socket.username = cookieName;																	//update the socket.username with the cookieName needed when disconnecting and posting messages
				coloredNameChange = "<li style='color:#" + socket.color + ";'>" + "You are " + socket.username;
				socket.emit("show username", coloredNameChange.bold());
			}
			
			//Udpate everyone's users list
			listOfUsersLength = listOfUsers.length;
			
			io.emit("clear user list", 0);																		//clear the user list first
			
			for(let j = 0; j < listOfUsersLength; j++)
			{
				io.emit("update user list", listOfUsers[j]);													//Sends the command to add the user to the list for all connected users
			};
			//end of updating user's list
		});
		
	//When a user wants to change their username, we go through a process by which we get the new usermame in the client.js
	//Once client.js sends us the new username to server.js here, we check to ensure it is not being used by someone else or already ours and then change it in the list and update it to all users
	socket.on("change username", (nameChange) =>
	{
		//Check to see if there already is a user in the listOfUsers array
		nameChange = nameChange.substring(6)
		var alreadyInList = false;
		var listOfUsersLength = listOfUsers.length;
		for(let i = 0; i < listOfUsersLength; i++)
		{
			//check to see if the user already exists in the list
			if(listOfUsers[i] != nameChange)
			{
				//do nothing
			}
			else
			{
				alreadyInList = true;
			}
		}
		if(alreadyInList == true)								//do not update username as username already exists
		{
			//If there already exists a user, let the user know
			socket.emit("bad username", nameChange + " is already taken. Please choose a username that is not already taken.");
		}
		else													//update username
		{
			//If no such user in the listOfUsers array, then change username it and update everyone's Users area
			
			//Step 1: Find the current username in listOfUsers array and remove it
			listOfUsers.splice(listOfUsers.indexOf(socket.username), 1, nameChange);
			
			//Step 2: Update the users of the name change
			//pushes the message back to the user who sent it, but bolded so it will appear as bold in the chat log
			socket.emit("chat message", ("*You have succesfully changed your username from '" + socket.username + "' to '" + nameChange + "'*").bold());	//publishes message to everyone including the sender
			//pushes the new message as a regular message to the rest of the users
			socket.broadcast.emit("chat message", ("*User '" + socket.username + "' has changed their name to '" + nameChange + "'* ").bold());				//publishes message to everyone including the sender
			
			//Step 2: Update the socket.username as it will be needed when disconnecting and posting messages
			socket.username = nameChange;
			
			//Step 3: Update the user's username in the title area
			coloredNameChange = "<li style='color:#" + socket.color + ";'>" + "You are " + nameChange;
			socket.emit("show username", coloredNameChange.bold());
			
			//Step 5: clear everyone's user list
			io.emit("clear user list", 0);
			
			//Step 5: Update the users in the userList
			listOfUsersLength = listOfUsers.length;
			for(let j = 0; j < listOfUsersLength; j++)
			{
				io.emit("update user list", listOfUsers[j]);						//Sends the command to add the user to the list for all connected users
			};
			
			//Step 6: Update user's cookie
			socket.emit("update cookieName", nameChange);
		}
	});

	//when a user sends a new message
	socket.on("chat message", (msg) =>
	{
		time = new Date(); //Updates the date and time
		updatedTime = String(time.getHours()).padStart(2, '0') + ":" + String(time.getMinutes()).padStart(2, '0')  + ":" + String(time.getSeconds()).padStart(2, '0')  + "." + String(time.getMilliseconds()).padStart(3, '0');

		var emojiMsg5 = msg.replace(":)", String.fromCodePoint(0x1F601));
		emojiMsg4 = emojiMsg5.replace(":(", String.fromCodePoint(0x1F61F));
		emojiMsg3 = emojiMsg4.replace(":o", String.fromCodePoint(0x1F62E));
		emojiMsg2 = emojiMsg3.replace("<3", String.fromCodePoint(0x1F495));
		emojiMsg1 = emojiMsg2.replace("lez", String.fromCodePoint(0x26A2));
		emojiMsg0 = emojiMsg1.replace("(.)(.)", String.fromCodePoint(0x1F46D));
		emojiMsgWithTimeAndUsername = updatedTime + " from " + socket.username + ": " + emojiMsg0
		emojiMsg = "<li style='color:#" + socket.color + ";'>" + emojiMsgWithTimeAndUsername;
		
		//pushes the message back to the user who sent it, but bolded so it will appear as bold in the chat log
		socket.emit("chat message", (emojiMsg).bold().fontsize(4)); //WITH COLOR
		
		//pushes the new message as a regular message to the rest of the users
		socket.broadcast.emit("chat message", (emojiMsg).bold()); //WITH COLOR
		
		//stores the new message in the history array
		chatHistory.push(emojiMsg); //to push message into the chat history array
	});
	
	//when a user disconnects
	socket.on("disconnect", () =>
	{
		// On disconnect, send a little message saying user has disconnected
        let msg = socket.username + " has disconnected!";
		msg = "<li style='color:#" + socket.color + ";'>" + msg;
        socket.broadcast.emit('chat message', (msg).bold());
		
		numberOfUsers--;
		
		//Begin removing user
		const userLocationNumber = listOfUsers.indexOf(socket.username);	//Find (by their username) where the user is located in the listOfUsers, and save the location number
		if(userLocationNumber > -1)											//ensure the number is at least 0 or higher
		{
			listOfUsers.splice(userLocationNumber);							//if it is, remove the entry at that location in the array (which should be the user that just disconnected
		}
		
		//Udpate users list again
		listOfUsersLength = listOfUsers.length;
		
		io.emit("clear user list", 0);										//clear the user list first
		
		for(let j = 0; j < listOfUsersLength; j++)
		{
			io.emit("update user list", listOfUsers[j]);					//Sends the command to add the user to the list for all connected users
		};
		//end of updating user's list
	});
});

http.listen(3000, () =>
{
	console.log("listening on *:3000");
});
