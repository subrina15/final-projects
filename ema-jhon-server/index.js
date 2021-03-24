const express = require('express');
const cloudinary = require('cloudinary');
const multer = require('multer');
const MongoClient = require('mongodb').MongoClient;
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const {ObjectId} = require('mongodb');
const cors = require('cors');
require('dotenv').config();

cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.API_KEY, 
  api_secret: process.env.API_SECRET 
});

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const storage = multer.diskStorage({
  destination: (req, file, callback) =>{
      callback(null, 'uploads')
  },
  filename: (req, file, callback) =>{
      callback(null, file.fieldname+path.extname(file.originalname))
  }
})

const upload = multer({
  storage: storage
});


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@mrshop.qyrhu.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true  });
client.connect(err => {
  const productCollection = client.db("MRShopStore").collection("products");
  const orderCollection = client.db("MRShopStore").collection("orders");
  const categoryCollection = client.db("MRShopStore").collection("Categories");
  const sellerCollection = client.db("MRShopStore").collection("sellers");
  const userCollection = client.db("MRShopStore").collection("allUsers");
  const supplierCollection = client.db("MRShopStore").collection("suppliers");
  
  app.post('/addProduct', upload.single('productImage'), async (req, res) => {
      const result = await cloudinary.uploader.upload(req.file.path).catch(cloudError => console.log(cloudError));
      if(result){
        const productData = {...req.body, productImage: result.secure_url};  
        productCollection.insertOne(productData)
        .then(insertResult => {
            if(insertResult.insertedCount < 0){
                res.send({"status": "error","message": `<p className="text-danger">Data corrupted</p>`})
            }
            else{
                res.send(insertResult.ops[0]);
            }
        })
        .catch(dbError => console.log(dbError));
      }
      else{
          res.status(404).send('Upload Failed');
      }
  })

  app.post('/addCategory', upload.single('categoryImage'), async (req, res) => {
    const result = await cloudinary.uploader.upload(req.file.path).catch(cloudError => console.log(cloudError));
    if(result){
      const categoryData = {...req.body, categorytImage: result.secure_url};  
      categoryCollection.insertOne(categoryData)
      .then(insertResult => {
          if(insertResult.insertedCount < 0){
              res.send({"status": "error","message": `<p className="text-danger">Data corrupted</p>`})
          }
          else{
              res.send(insertResult.ops[0]);
          }
      })
      .catch(dbError => console.log(dbError));
    }
    else{
        res.status(404).send('Upload Failed');
    }
  })

  app.get('/getAllSuppliers', (req, res) => {
    supplierCollection.find({})
      .toArray((err, documents) => {
        res.send(documents);
      })
  })

  app.post('/addSupplyPerson', (req, res) => {
    const supplierInfo = req.body;
    supplierCollection.insertOne(supplierInfo)
    .then((result) => {
        if(result.insertedCount > 0){
            res.send(result.ops[0]);
        }
        else{
            res.send({"status": "error","message": `<p className="text-danger">Data not-inserted!</p>`})
        }
    })
  })

  app.post('/addOrder', (req, res) => {
    const order = req.body;
    orderCollection.insertOne(order)
    .then((result) => {
        if(result.insertedCount > 0){
          res.send(result.ops[0]);
        }
    })
  })

  app.post('/writeSingleUser', (req, res) => {
    const userInfo = req.body;
    userCollection.insertOne(userInfo)
    .then((result) => {
        if(result.insertedCount > 0){
            res.send(result.ops[0]);
        }
        else{
            res.send({"status": "error","message": `<p className="text-danger">Data not inserted!</p>`})
        }
    })
  })

  app.post('/addSeller', (req, res) => {
    const seller = req.body;
    sellerCollection.insertOne(seller)
    .then((result) => {
        if(result.insertedCount > 0){
          res.send(result.ops[0]);
        }
    })
  })

  app.get('/categories', (req, res) => {
    categoryCollection.find({})
    .toArray((err, documents) => {
      res.send(documents);
    })
  })

  app.patch('/updateUser/:u_Id', (req, res) => {
    userCollection.updateOne({_id : ObjectId(req.params.u_Id)},
    {
        $set:{ userShippingAddress: req.body}
    })
    .then(result => {
      res.send(result.modifiedCount > 0);
    });
  })

  app.get('/getAllOrders', (req, res) => {
    orderCollection.find({})
    .toArray((err, documents) => {
      res.send(documents);
    })
  })

  app.get('/getAllSellers', (req, res) => {
    sellerCollection.find({})
    .toArray((err, documents) => {
      res.send(documents);
    })
  })

  app.get('/products', (req, res) => {
      productCollection.find({}).hint({ $natural : -1 })
      .toArray((err, documents) => {
        res.send(documents);
      })
  })

  app.get('/product/:key', (req, res) => {
    productCollection.find({_id: ObjectId(req.params.key)})
    .toArray((err, documents) => {
      res.send(documents[0]);
    })
  })

  app.get('/seller/:email', (req, res) => {
    sellerCollection.find({sellerUserName : req.params.email})
    .toArray((err, documents) => {
      res.send(documents[0]);
    })
  });

  app.get('/getAllUsers', (req, res) => {
    userCollection.find({})
    .toArray((err, documents) =>{
      res.send(documents);
    })
  });

  app.patch('/updateSellerInfo/:s_Id', (req, res) => {
    userCollection.updateOne({_id : ObjectId(req.params.s_Id)},
    {
        $set:{ sellerName: req.body.sellerName, sellerAddress: req.body.sellerAddress}
    })
    .then(result => {
      res.send(result.modifiedCount > 0);
    });
  });

  app.delete('/deleteSeller/:s_Id', (req, res) => {
    userCollection.deleteOne({_id : ObjectId(req.params.s_Id)})
    .then(result =>{
      res.send(result.deletedCount > 0);
    })
  });

  app.delete('/deleteProduct/:p_Id', (req, res) => {
    productCollection.deleteOne({_id : ObjectId(req.params.p_Id)})
    .then(result =>{
      res.send(result.deletedCount > 0);
    })
  });

  app.delete('/deleteCat/:c_Id', (req, res) => {
    categoryCollection.deleteOne({_id : ObjectId(req.params.c_Id)})
    .then(result =>{
      res.send(result.deletedCount > 0);
    })
  });

  app.delete('/deleteSupp/:s_Id', (req, res) => {
    categoryCollection.deleteOne({_id : ObjectId(req.params.s_Id)})
    .then(result =>{
      res.send(result.deletedCount > 0);
    })
  });

  app.patch('/updateOrderInfo/:o_Id', (req, res) => {
    orderCollection.updateOne({_id : ObjectId(req.params.o_Id)},
    {
        $set:{ status: req.body.status}
    })
    .then(result => {
      res.send(result.modifiedCount > 0);
    });
  });

  app.patch('/updateCatInfo/:c_Id', (req, res) => {
    categoryCollection.updateOne({_id : ObjectId(req.params.c_Id)},
    {
        $set:{ categoryName: req.body.categoryName, categoryDetails: req.body.categoryDetails }
    })
    .then(result => {
      res.send(result.modifiedCount > 0);
    });
  });
  
  app.get('/', (req, res) => {
    res.send('Ema john server');
  });

});

app.listen(process.env.PORT || 5000);