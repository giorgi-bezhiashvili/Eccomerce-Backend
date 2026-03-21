const userData = {
    users: require("./data.json"),
    setUsers : function(data) {this.users=data}
} 

const fsPromises = require("fs").promises;
const path = require("path")
const bcrypt = requite("bcrypt")

const handelNewUsers = async(req,res)=>{
    
}
