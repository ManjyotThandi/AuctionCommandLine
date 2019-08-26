 var mysql = require('mysql');
 var inquirer = require('inquirer');

 // global variable for the object they want to post or bid on 

 var auctionItem;

 // array which holds the list of items avaliable to bid on

 var itemsAvaliable = []

 // list out details of connection
 var connection = mysql.createConnection({
     host: "localhost",
     port: 3306,
     user: "root",
     password: "password",
     database: "auction_DB"
 });

 // now we try and make the connection
 connection.connect((err) =>{
     if(err) throw err;
     console.log(`you have made the connection. you are on id ${connection.threadId}`)
    auction();
 })

 const auction = () => {
     inquirer.prompt([
         {
             type: 'list',
             name: 'choice',
             choices: ["POST AN ITEM", "BID ON AN ITEM"],
             message: "What would you like to do for this auction?"
         },
         {
             type: 'input',
             name: 'itemName',
             message: "What item do you want to post?",
             when: function(answers){
                 if(answers.choice === "POST AN ITEM"){
                     return true;
                 }
             }
         },
         {
            type: 'input',
            name: 'startingPrice',
            message: "What price do you want to list this at?",
            when: function(answers){
                if(answers.choice === "POST AN ITEM"){
                    return true;
                }
            }
        }
     ]).then(answers => {
         if(answers.choice === "POST AN ITEM"){
             // Puts in whatever item was typed out in the question above into the database after sanitzing it.
             auctionItem = answers.itemName;
             connection.query("INSERT INTO item (item_name) VALUES (?);",[auctionItem],function(err, res){
                 if (err) throw error;
                 console.log(`Your item ${auctionItem} has been posted in the auction. Good luck :)`)
                })
                
                // updates the bid table as well to include price specified
                connection.query("INSERT INTO bid (item_id,price) VALUES ((SELECT id FROM item WHERE item_name=?),?) ",[auctionItem,answers.startingPrice], (err,res) =>{
                    console.log("Your item has been priced as well.")
                })
             // End connection so it is not a run on connection for the post an item query..
             connection.end();
         }
         else {
                if(answers.choice === "BID ON AN ITEM"){
                    inquirer.prompt([
                        {
                            type: 'input',
                            name: 'bidItem',
                            message: "What item would you like to bid on?"
                        },
                        {
                            type: 'input',
                            name: 'bidPrice',
                            message: "What price in CAD would you like to bid?"
                        }
                    ]).then(answers =>{
                        // make sure the users choice exists in the database
                         connection.query("SELECT item_name FROM item", (err,res) =>{
                             if(err) throw error;

                             // update global array to include all items in db currently
                             for(i in res){
                                 itemsAvaliable.push(res[i].item_name.toLowerCase())
                             }
                             console.log(itemsAvaliable)

                             // logic for whether or not the user picked item exists in the db
                            if(itemsAvaliable.includes(answers.bidItem.toLowerCase())){
                                connection.query("SELECT b.price, i.item_name FROM item i INNER JOIN bid b ON i.id = b.item_id WHERE i.item_name = ?", 
                                [answers.bidItem],function(err,res){
                                    if(err){
                                        console.log(err)
                                    }
                                    var highestPrice = res[0].price;
                                    console.log(highestPrice);
                                    
                                    // logic for if biding price is higher than highest price, that will be the new bp. Otherwise let them bid again.
                                    if(answers.bidPrice > highestPrice){
                                        connection.query("UPDATE bid SET price = ? WHERE bid.item_id = (SELECT b.item_id FROM (SELECT * FROM bid) as b INNER JOIN item i ON i.id=b.item_id WHERE i.item_name = ?)"
                                        , [answers.bidPrice, answers.bidItem], function(err,res){
                                            if(err) throw error
                                            console.log(res)
                                        })
                                        }
                                        else{
                                            console.log(`Your bid price for this item was not high enough. The bid price currently is ${highestPrice}, and your offer was ${answers.bidPrice}. Please try again`)
                                        }
    
                                        // end the connection once both queries are run
                                        connection.end();
                                       })
                            }
                            // if item does not exist in db.
                            else{
                                console.log("Please choose an item that is up for auction.")
                                connection.end();
                                return true;
                            }

                        })
                
                    })
                 
             }
         }

     })
 }