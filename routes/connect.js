let mysql = require('mysql');
let conn = mysql.createConnection({
    host:'localhost',
    user:'root',
    password:'',
    database:'db_ecommerce'
})

conn.connect((err)=>{
    if (err) throw err;
    console.log('connect db_ecommerce success')
})

module.exports = conn;
