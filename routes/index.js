let express = require('express');
let router = express.Router();
let conn = require('./connect');
let jwt = require('jsonwebtoken');
let session = require('express-session');
let formidable = require('formidable');
let fs = require('fs');
const { render } = require('ejs');
const { query } = require('express');
const console = require('console');
let secretCode = 'myecom2022key';
let numeral = require('numeral');
let dayjs = require('dayjs');
let dayFormat =  'DD/MM/YYYY'

router.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: {
     maxAge : 30*24*60*1000 }
}))

router.use((req,res,next)=>{
  res.locals.session = req.session;
  res.locals.numeral = numeral;
  res.locals.dayjs = dayjs;
  res.locals.dayFormat = dayFormat;
  next();
});

/* GET home page. */
router.get('/', function(req, res, next) {
  let params = [];
  let sql = 'SELECT * FROM tb_product ';

  if(req.query.search != undefined){
    sql += ' WHERE name LIKE(?)';
    params.push ('%'+ req.query.search + '%');
  }

  sql += ' ORDER BY id DESC';

  conn.query(sql,params,(err,result)=>{
    if(err) throw err;

    if (req.session.cart == undefined){
      req.session.cart = [];
    }
    res.render('index', { products: result });
  })
});

router.get('/login',(req,res)=>{
  res.render('login',{});
})

router.post('/login',(req,res)=>{
  let sql = 'SELECT * FROM tb_user WHERE user = ? AND pass = ?' ;
  let params = [
    req.body['user'],
    req.body['pass']
  ]
  conn.query(sql,params,(err,result)=>{
     if(err) throw err;
     
    if(result.length > 0 ){
      let id = result[0].id;
      let name = result[0].name;
      let token = jwt.sign({id: id, name: name},secretCode);
      req.session.token = token;
      req.session.name = name;
      res.redirect('/home')
      
    }else{
        res.send('Username or Password invalid')
      }
    
  })
})

// check login ต้องสร้างเป็น function ธรรมดา (midle where)
function isLogin(req,res,next){
  if (req.session.token != undefined){
    next();
  }else{
    res.redirect('/login');
  }
}

router.get('/home', isLogin, (req , res)=>{
 res.render('home')
})

router.get('/logout',isLogin,(req,res)=>{
  req.session.destroy();
  res.redirect('/login');
})

router.get('/changeProfile',isLogin,(req,res)=>{
  let data = jwt.verify(req.session.token, secretCode);
  let  sql = 'SELECT * FROM tb_user WHERE id = ? ';
  let params = [data.id]

  conn.query(sql,params,(err,result)=>{
    if (err) throw err;
    res.render('changeProfile',{user : result[0]});
  })
})



router.post('/changeProfile/:id', isLogin, (req, res) => {
  let sql = 'UPDATE tb_user SET name = ?, user = ?';
  let params = [
    req.body['name'],
    req.body['user'],
   
  ];

  if (req.body['pass'] != undefined) {
    sql += ',pass = ? WHERE id = ?'  ;
    params.push(req.body['pass']);
    params.push(req.params.id);
  }
  
  conn.query(sql, params, (err, result) => {
    if (err) throw err;
    req.session.name =  req.body['name'];
    req.session.message = 'Save Success';
    res.redirect('/changeProfile');
  })
})

router.get('/user',isLogin,(req,res)=>{
  let sql = 'SELECT * FROM tb_user ORDER BY id';
  conn.query(sql,(err,result)=>{
    if(err) throw err;
    res.render('user',{users:result});
  })
})

router.get('/addUser',isLogin,(req,res)=>{
  
  res.render('addUser',{user:{}});
  
})

router.post('/addUser',isLogin,(req,res)=>{
  let sql = 'INSERT INTO tb_user SET ?';
  let params = req.body;
  conn.query(sql,params,(err,result)=>{
    if(err) throw err;
     res.redirect('/user');
  })
})

router.get('/editUser/:id',isLogin,(req,res)=>{
  let sql = 'SELECT * FROM tb_user WHERE id = ?';
  let params = req.params.id;
  conn.query(sql,params,(err,result)=>{
    if(err) throw err;
    res.render('addUser', {user: result[0]})
  })
})

router.post('/editUser/:id',isLogin,(req,res)=>{
  let sql = 'UPDATE tb_user SET name = ? , user = ? , pass = ?, level = ? WHERE id = ?'
  let params = [
    req.body['name'],
    req.body['user'],
    req.body['pass'],
    req.body['level'],
    req.params.id
  ]
  conn.query(sql,params,(err,result)=>{
    if(err) throw err;
    res.redirect('/user');
  })
})

router.get('/deleteUser/:id',isLogin,(req,res)=>{
  let sql = 'DELETE FROM tb_user WHERE id = ?'
  let params = req.params.id;
  conn.query(sql,params,(err,result)=>{
    if (err) throw err;
    res.redirect('/user');
  })
})

router.get('/groupProduct',isLogin,(req,res)=>{
  let sql = 'SELECT * FROM tb_group_product ORDER BY id';
  conn.query(sql,(err,result)=>{
    if(err) throw err;
  res.render('groupProduct',{groupProducts : result});
})
})

router.get('/addGroupProduct',isLogin,(req,res)=>{
  res.render('addGroupProduct',{groupProducts:{}});
})

router.post('/addGroupProduct',isLogin,(req,res)=>{
  let sql = 'INSERT INTO tb_group_product SET ?'
  let params = req.body;
  conn.query(sql,params,(err,result)=>{
    if(err) throw err;
    res.redirect('/groupProduct');
  })
})


router.get('/editGroupProduct/:id',isLogin,(req,res)=>{
  let sql = 'SELECT * FROM  tb_group_product WHERE id = ?'
  let params = req.params.id;
  conn.query(sql,params,(err,result)=>{
    if(err) throw err;
    res.render('addGroupProduct',{groupProducts: result[0]})
  })
})

router.post('/editGroupProduct/:id',isLogin,(req,res)=>{
  let sql = 'UPDATE  tb_group_product SET name = ? WHERE id = ?';
  let params = [
  req.body['name'],
  req.params.id
  ]
  conn.query(sql,params,(err,result)=>{
    if(err) throw err;
   res.redirect('/groupProduct');
  })
})

router.get('/deleteGroupProduct/:id',isLogin,(req,res)=>{
  let sql = 'DELETE FROM tb_group_product WHERE id = ?'
  let params = req.params.id;
  conn.query(sql,params,(err,result)=>{
    if(err) throw err;
    res.redirect('/groupProduct');
  })
})

router.get('/product',isLogin,(req,res)=>{
 let sql = ''+
 'SELECT tb_product.*, tb_group_product.name AS group_product_name FROM tb_product '+
 'LEFT JOIN tb_group_product ON tb_group_product.id = tb_product.group_product_id '+
 'ORDER BY tb_product.id DESC';
 conn.query(sql,(err,result)=>{
  if(err)throw err;
 res.render('product',{products: result});
 })
})

router.get('/addProduct',isLogin,(req,res)=>{
  let sql = 'SELECT * FROM tb_group_product ORDER BY name'
  conn.query(sql,(err,result)=>{
    res.render('addProduct',{product:{},groupProducts:result});
  })
 
})


router.post('/addProduct',isLogin,(req,res)=>{
  let form = new formidable.IncomingForm();
  form.parse(req,(err,fields,file)=>{
    let filepath = file.img.filepath;
    let newpath = 'C:/Users/CHAITAWAT/Desktop/Fullstack/app/public/images/';
    newpath += file.img.originalFilename;
    fs.copyFile(filepath,newpath,()=>{
      // insert to data base 
      let sql = 'INSERT INTO tb_product(group_product_id,barcode,name,cost,price,img) VALUES(?,?,?,?,?,?)' 
      let params= [
        fields['group_product_id'],
        fields['barcode'],
        fields['name'],
        fields['cost'],
        fields['price'],
        file.img.originalFilename
      ];
      conn.query(sql,params,(err,result)=>{
        if(err) throw err;
        res.redirect('/product');
      })
    })
  })
})

router.get('/editProduct/:id',isLogin,(req,res)=>{
  let sql = 'SELECT * FROM tb_product WHERE id= ?';
  let params= req.params.id;
  conn.query(sql,params,(err,products)=>{
    if(err) throw err;
     sql = 'SELECT * FROM tb_group_product ORDER BY name'
    conn.query(sql,(err,result  )=>{
      if(err) throw err;
      res.render('addProduct',{product:products[0],groupProducts:result})
    })  
  })
})

router.post('/editProduct/:id',isLogin,(req,res)=>{
  let form = new formidable.IncomingForm();
  form.parse(req,(err,fields,file)=>{
    let filepath = file.img.filepath;
    let newpath = 'C:/Users/CHAITAWAT/Desktop/Fullstack/app/public/images/';
    let pathUpload = newpath + file.img.originalFilename;
    fs.copyFile(filepath,pathUpload,()=>{
      let sqlSelect = 'SELECT img FROM tb_product WHERE id = ? ';
      let paramsSelect = req.params.id;
      conn.query(sqlSelect, paramsSelect,(err,oldProducts)=>{
        let product = oldProducts[0];
        fs.unlink(newpath + product.img,()=>{
          if(err) {
            console.log(err);
          }
           // update to data base 
        let sql = 'UPDATE tb_product SET group_product_id = ?, barcode = ?, name = ?, cost = ?, price = ?, img = ? WHERE id = ?' 
        let params= [
        fields['group_product_id'],
        fields['barcode'],
        fields['name'],
        fields['cost'],
        fields['price'],
        file.img.originalFilename,
        req.params.id
      ];
      conn.query(sql,params,(err,result)=>{
        if(err) throw err;
        res.redirect('/product');
        })
        });
        
      })
    })
  })
})

router.get('/deleteProduct/:id/:img',isLogin,(req,res)=>{
    let newpath = 'C:/Users/CHAITAWAT/Desktop/Fullstack/app/public/images/';
    newpath += req.params.img;
    console.log(newpath)
    fs.unlink(newpath,(err)=>{
      if(err) err;
      let sql= 'DELETE FROM tb_product WHERE id = ?'
      let params= req.params.id;
      conn.query(sql,params,(err,result)=>{
      if(err) throw err;
      res.redirect('/product');
       })
    })
  })

 router.get('/addToCart/:id',(req,res)=>{
    let cart = [];
    if(req.session.cart == null){
      //fist item
     let order  = {
        product_id: req.params.id,
        qty: 1
      }
        cart.push(order);
    } else {
      cart = req.session.cart;
      let qty = 1;
      let newItem = true;

      for(let i = 0 ; i < cart.length ; i++) {
        if (cart[i].product_id == req.params.id) {
        cart[i].qty += qty;
        newItem = false;
       }
     }
     if(newItem){
      let order = {
        product_id : req.params.id,
        qty: qty
      }
      cart.push(order);
     }
    }
    req.session.cart = cart;
    console.log(req.session);
    res.redirect('/');
  })

  router.get('/myCart',async(req,res)=>{
    let conn = require('./connect2');
    let cart = req.session.cart;
    let products = [];
    let totalQty= 0;
    let totalPrice = 0;
   if(cart.length > 0){
    for (let i = 0; i < cart.length ; i++){
      let c = cart[i];
      let sql = 'SELECT * FROM tb_product WHERE id = ?';
      let params = [c.product_id];

      let [rows, fields] = await conn.query(sql, params);
      let product = rows[0];

      let p = {
        qty: c.qty,
        id: product.id,
        barcode: product.barcode,
        name: product.name,
        price: product.price,
        img: product.img

      }
      products.push(p);
      totalQty += parseInt(c.qty);
      totalPrice += (c.qty * product.price);
      }
    }
    res.render('myCart',{product: products, totalQty : totalQty, totalPrice:totalPrice});
  
  })

  router.get('/deleteItemInCart/:id', (req, res) => {
    let cart = req.session.cart;

    for (let i = 0 ; i < cart.length; i++){
      if(cart[i].product_id == req.params.id){
        cart.splice(i,1);
      }
    }
    req.session.cart = cart;
    res.redirect('/myCart');
  })
 
  router.get('/editItemInCart/:id',(req,res)=>{
    let sql = 'SELECT * FROM tb_product WHERE id = ?';
    let params  = req.params.id;
    conn.query(sql,params,(err,result)=>{
      if(err) throw err;
      let product = result[0];
      let cart  = req.session.cart;
      for(let i=0 ; i < cart.length; i++){
        if(cart[i].product_id == product.id){
          product.qty = cart[i].qty;
        }
      }
      res.render('editItemInCart',{product: product})
    })
  })
  
  router.post('/editItemInCart/:id',(req,res)=>{
    let cart = req.session.cart;

    for(let i = 0; i < cart.length; i++){
      if(cart[i].product_id == req.params.id){
        cart[i].qty = req.body['qty'];
      }
    }
    req.session.cart = cart;
    res.redirect('/myCart')
  })
  
  router.get('/confirmOrder',(req,res)=>{
    res.render('confirmOrder');
  })

  router.post('/confirmOrder', async(req, res) => {
    let conn = require('./connect2');

    let sql = 'INSERT INTO tb_order(name, address, phone, create_date) VALUES(?, ?, ?, NOW())';
    let params = [
      req.body['name'],
      req.body['address'],
      req.body['phone']
    ]
    try{
    let [rows,fields] =  await conn.query(sql, params);
    console.log(rows);
       let lastId = rows.insertId;
       let carts = req.session.cart;

      for (let i=0; i < carts.length ;i++){
        let cart = carts[i];
        let sqlFindProduct = 'SELECT price FROM tb_product WHERE id = ?';
        params = [cart.product_id];
        let[rows, fields] = await conn.query(sqlFindProduct,params);
        let price = rows[0].price;
        console.log(price);
        //find product data
        let sqlOrderDetail = 'INSERT INTO tb_order_detail(order_id,product_id,qty,price) VALUES (?,?,?,?)';
        params =[
          lastId, 
          cart.product_id,
          cart.qty,
          price
        ]
       await conn.query(sqlOrderDetail,params);
      }
    }catch(err){
      console.log(err);
    }
     
     res.redirect('/confirmOrderSuccess');
  });

  router.get('/confirmOrderSuccess',(req,res)=>{
    res.render('confirmOrderSuccess');
  })

  router.get('/order',isLogin,(req,res)=>{
    let sql = 'SELECT * FROM tb_order ORDER BY id DESC'
    conn.query(sql,(err,result)=>{
      if(err) throw err;
      res.render('order',{orders:result});
    })
  })

  router.get('/orderInfo/:id',isLogin,(req,res)=>{
    let sql = '';
    sql += ' SELECT tb_order_detail.*, tb_product.barcode, tb_product.name, tb_product.img FROM tb_order_detail';
    sql += ' LEFT JOIN tb_product ON tb_product.id = tb_order_detail.product_id';
    sql += ' WHERE tb_order_detail.order_id = ?';
    sql += ' ORDER BY tb_order_detail.id DESC';
    let params = [req.params.id];
    let totalPrice = 0 ;
    let totalQty = 0;

    conn.query(sql,params,(err,result)=>{
      if(err) throw err;

      for(i = 0 ; i < result.length ; i++){
         let orderInfo = result[i];
         totalQty += orderInfo.qty;
         totalPrice += (orderInfo.qty * orderInfo.price)
      }
      res.render('orderInfo',{
        orderDetails : result,
        totalQty:totalQty,
        totalPrice:totalPrice});

    })
  })

 

  router.get('/deleteOrder/:id',isLogin,(req,res)=>{
    let sql = 'DELETE FROM tb_order WHERE id = ? '
    let params = req.params.id;
    conn.query(sql,params,(err,result)=>{
      if(err) throw err;
      sql = 'DELETE FROM tb_order_detail WHERE order_id = ?'
      conn.query(sql,params,(err,result)=>{
        if(err) throw err;
         res.redirect('/order');
    })
  })
})
router.get('/payOrder/:id',isLogin,(req,res)=>{
  res.render('payOrder',{orderId: req.params.id});
})

router.post('/payOrder/:id',isLogin,(req,res)=>{
  let sql = 'UPDATE tb_order SET pay_date =? ,pay_remark=? WHERE id = ?';
  let params = [
    req.body['pay_date'],
    req.body['pay_remark'],
    req.params.id
  ]
  conn.query(sql,params,(err,result)=>{
    if(err) throw err;
    res.render('payOrderSuccess');
  })
})

router.get('/sendOrder/:id',isLogin,(req,res)=>{
   
  res.render('sendOrder',{orderId : req.params.id})
})

router.post('/sendOrder/:id',isLogin,(req,res)=>{
  let sql = 'UPDATE tb_order SET send_date = ?, track_name = ?, track_code = ?, track_remark = ? WHERE id = ?'
  let params = [
    req.body['send_date'],
    req.body['track_name'],
    req.body['track_code'],
    req.body['track_remark'],
    req.params.id
  ]
  conn.query(sql,params,(err,result)=>{
    if(err) throw err;
    res.render('sendSuccess');
  })
})

router.get('/reportSalePerDay', isLogin,async (req,res)=>{
  let conn =require('./connect2');
  let y = dayjs().year();
  let m = dayjs().month()+1;
  let daysInMonth = dayjs(y + '/' + m + '/1').daysInMonth();
  let arr = [];
  let arrYears = [];
  let arrMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  // ถ้าค่ามาจาก method get ใช้ req.query แทน req.body
  if(req.query['year'] != undefined){
    y= req.query['year'];
    m= req.query['month'];
  }
  for (let i = 0; i <= daysInMonth; i++){
    let sql = `SELECT SUM(qty * price) AS totalPrice FROM tb_order_detail
    LEFT JOIN tb_order ON tb_order.id = tb_order_detail.order_id
    WHERE DAY(tb_order.pay_date) = ?  
    AND MONTH(tb_order.pay_date) = ? 
    AND YEAR(tb_order.pay_date) = ?`  
    let params = [i,m,y ]
    let [rows,fields]  = await conn.query(sql,params);
    arr.push(rows[0].totalPrice);
  }
  for (let i = y-5;i<= y;i++){
    arrYears.push(i)
  }
  res.render('reportSalePerDay',{arr: arr, y: y, m: m, arrMonths: arrMonths, arrYears: arrYears });
})

router.get('/reportSalePerMonth', isLogin,async (req,res)=>{
  let conn = require('./connect2');
  let y = dayjs().year();
  let arr = [];
  let arrYears = [];
  
  if(req.query['year'] != undefined){
    y= req.query['year'];
  }

  for (let i = 1; i <= 12; i++){
    let sql = `SELECT SUM(qty * price) AS totalPrice FROM tb_order_detail
    LEFT JOIN tb_order ON tb_order.id = tb_order_detail.order_id 
    WHERE MONTH(tb_order.pay_date) = ? 
    AND YEAR(tb_order.pay_date) = ?` 
    let params = [i,y] 
    let [rows,fields] = await conn.query(sql,params);
    arr.push(rows[0].totalPrice)
  }
  for (let i = y-4;i<= y;i++){
    arrYears.push(i)
  }
  res.render('reportSalePerMonth',{arr: arr, arrYears: arrYears,y:y })
})

router.get('/reportSalePerProduct',isLogin , async (req,res)=>{
  let conn = require('./connect2');
  let sql = 'SELECT * FROM tb_product';
  let arr = [];
  let [rows, fields] = await conn.query(sql);
  for (let i = 0; i  < rows.length; i++){
    let product = rows[i];
    let barcode = product.barcode;
    let name = product.name;
    let id = product.id;
    sql = `SELECT SUM(qty * price) AS totalPrice FROM tb_order_detail
    LEFT JOIN tb_order ON tb_order.id = tb_order_detail.order_id
    WHERE tb_order_detail.product_id = ?`;
    let [rows2,fields2] = await conn.query(sql,[id]);
    let totalPrice = rows2[0].totalPrice;
    let p = {
      totalPrice: totalPrice,
      barcode: barcode,
      id : id,
      name: name
    }
    arr.push(p);
  }
  res.render('reportSalePerProduct',{arr:arr})
})
router.get('/trackOrder',(req,res)=>{
  res.render('trackOrder',{orders:{}})
})

router.post('/trackOrder',(req,res)=>{
  let sql = 'SELECT * FROM tb_order WHERE phone = ? AND pay_date IS NOT NULL'
  params = req.body['phone'];
  conn.query(sql,params,(err,result)=>{
    if(err) throw err;
    console.log(result);
    res.render('trackOrder',{orders:result});
  })
})

router.get('/importFromStock',isLogin,(req,res)=>{
  let sql = '';
  sql += ' SELECT tb_product.barcode, tb_product.name, ';
  sql += ' tb_stock_in.qty, tb_stock_in.created_date, tb_stock_in.id, tb_stock_in.remark';
  sql += ' FROM tb_stock_in';
  sql += ' LEFT JOIN tb_product ON tb_stock_in.product_id = tb_product.id';

  conn.query(sql,(err,result)=>{
    if(err) throw err;
    res.render('importFromStock',{stockIn:result})
  })
  
})

router.post('/importFromStock',isLogin,async(req,res)=>{
  let barcode = req.body['product_barcode'];
  let conn = require('./connect2');

  let sql = 'SELECT id FROM tb_product WHERE barcode = ?';
  let params = [barcode];

  try {
    let [product, fields] = await conn.query(sql, params);

    if (product.length > 0) {
      let id = product[0].id;

      sql = 'INSERT INTO tb_stock_in(product_id, qty, created_date, remark) VALUES(?, ?, NOW(), ?)';
      params = [id, req.body['qty'], req.body['remark']];
      conn.query(sql, params);
      res.redirect('/importFromStock');
    } else {
      res.send('barcode not found');
    }
  } catch (e) {
    res.send('Error : ' + e);
  }
}) 


router.get('/deleteStock/:id',isLogin,(req,res)=>{
  let sql = 'DELETE FROM tb_stock_in WHERE id = ?';
  let params = req.params.id;
  conn.query(sql,params,(err,result)=>{
    if(err) throw err;
    res.redirect('/importFromStock');
  })
})

router.get('/exportFromStock',isLogin,(req,res)=>{
  let sql = '';
  sql += ' SELECT tb_product.barcode, tb_product.name, ';
  sql += ' tb_stock_out.qty, tb_stock_out.created_date, tb_stock_out.id, tb_stock_out.remark';
  sql += ' FROM tb_stock_out';
  sql += ' LEFT JOIN tb_product ON tb_stock_out.product_id = tb_product.id';

  conn.query(sql,(err,result)=>{
    if(err) throw err;
    res.render('exportFromStock',{stockOut:result});
  })
 
})

router.post('/exportFromStock',isLogin,async (req,res)=>{
  let barcode = req.body['product_barcode'];
  let conn = require('./connect2');

  let sql = 'SELECT id FROM tb_product WHERE barcode = ?';
  let params = [barcode];

  try {
    let [product, fields] = await conn.query(sql, params);

    if (product.length > 0) {
      let id = product[0].id;

      sql = 'INSERT INTO tb_stock_out(product_id, qty, created_date, remark) VALUES(?, ?, NOW(), ?)';
      params = [id, req.body['qty'], req.body['remark']];
      conn.query(sql, params);
      res.redirect('/exportFromStock');
    } else {
      res.send('barcode not found');
    }
  } catch (e) {
    res.send('Error : ' + e);
  }
})

router.get('/deleteExportStock/:id',isLogin,(req,res)=>{
  let sql = 'DELETE FROM tb_stock_out WHERE id = ?';
  let params = req.params.id;
  conn.query(sql,params,(err,result)=>{
    if(err) throw err;
    res.redirect('/exportFromStock');
  })
})

router.get('/reportStock', isLogin, async (req, res) => {
  let sql = 'SELECT * FROM tb_product ORDER BY name ASC';
  let conn = require('./connect2');
  let arr = [];

  try {
    let [products, fields] = await conn.query(sql);

    for (let i = 0; i < products.length; i++) {
      let product = products[i];
      let params = [product.id];

      sql = 'SELECT SUM(qty) AS qtyIn FROM tb_stock_in WHERE product_id = ?';
      let [stockIn] = await conn.query(sql, params);

      sql = 'SELECT SUM(qty) AS qtyOut FROM tb_stock_out WHERE product_id = ?';
      let [stockOut] = await conn.query(sql, params);

      let objProduct = {
        id: product.id,
        barcode: product.barcode,
        name: product.name,
        qtyIn: stockIn[0].qtyIn,
        qtyOut: stockOut[0].qtyOut
      }

      arr.push(objProduct);
    }

    res.render('reportStock', { arr: arr });
  } catch (e) {
    res.send('Error : ' + e);
  }
})



module.exports = router;


