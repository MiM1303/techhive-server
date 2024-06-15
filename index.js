const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.0pky6me.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const productCollection = client.db("techhiveDB").collection("products");
    const reviewCollection = client.db("techhiveDB").collection("reviews");
    const userCollection = client.db("techhiveDB").collection("users");


    // JWT
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    // MIDDLEWARES

    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { user_email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'Admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // PRODUCTS API
    app.get('/products', async(req, res)=>{
        const result = await productCollection.find().toArray();
        res.send(result);
    })

    // FEATURED SECTION
    app.get('/featured', async(req, res)=>{
      const result = await productCollection.find({featured:true, status:"accepted"}).sort({"timestamp":-1}).limit(6).toArray();
      console.log(result);
      res.send(result);
  })

    // TRENDING SECTION
    app.get('/trending', async(req, res)=>{
      const result = await productCollection.find({status:"accepted"}).sort({"upvote_count":-1}).limit(6).toArray();
      console.log(result);
      res.send(result);
  })

    // REVIEWS API
    app.get('/reviews', async(req, res)=>{
        const result = await reviewCollection.find().toArray();
        res.send(result);
    })

    // REVIEW FOR A SPECIFIC PRODUCT
    app.get('/reviews/:id', async(req, res)=>{
        const id = req.params.id;
        const query = {product_Id: id};
        const result = await reviewCollection.find(query).toArray();
        res.send(result);
    })

    // PRODUCT DETAILS PAGE
    app.get('/products/:id', async(req, res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await productCollection.findOne(query);
        res.send(result);
    })

    // GETTING ALL ACCEPTED PRODUCTS OR SEARCHED PRODUCTS FOR ALL PRODUCTS PAGE
    app.get('/all-products', async(req, res)=>{
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const search = req.query.search;

      const regex = new RegExp(search, 'i');
        let query = {
          product_tags: { $in: [regex] },
          status: "accepted"
        }

      console.log('pagination query', req.query);
      const result = await productCollection.find(query).skip(page * size).limit(size).toArray();
      res.send(result);
    })

    // GETTING THE TOTAL NUMBER/COUNT OF ACCEPTED PRODUCTS OR SEARCHED FOR PRODUCTS PAGE PAGINATION
    app.get('/all-products-count', async(req, res)=>{
      const search = req.query.search;

      
        const regex = new RegExp(search, 'i');
        let query = {
          product_tags: { $in: [regex] },
          status: "accepted"
        }
        console.log('query set', query);
        // const count = await productCollection.countDocuments(query);
    
        
      const count = await productCollection.countDocuments(query);
      console.log("outside if-else", count)
      res.send({count});
    })

    // USER API
    app.get('/users', verifyToken, verifyAdmin, async(req, res)=>{
      // console.log(req.headers);
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    // GET USER DATA BY EMAIL
    app.get('/users/:email', async(req, res)=>{
      const email = req.params.email;
      const result = await userCollection.findOne({user_email:email});
      res.send(result);
    })

    // CHECK IF ADMIN
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'Admin';
      }
      res.send({ admin });
    })

    // GET PRODUCTS BY EMAIL
    app.get('/products/email/:email', async(req, res)=>{
      const email = req.params.email;
      console.log(email);
      const result = await productCollection.find({owner_email: email}).toArray();
      res.send(result);
    })

    // ADD PRODUCT BY ID FOR UPDATE AND DELETE FROM MY PRODUCTS
    app.get('/add-product', async(req, res)=>{
      const products = productCollection.find();
      const result = await products.toArray();
      res.send(result);
    })

    app.get('/add-product/:id', async(req, res)=>{
      const id = req.params.id;
      console.log(id);
      const query = {_id: new ObjectId(id)}
      const result = await productCollection.findOne(query);
    res.send(result);
    })

    // UPDATE FROM MY PRODUCTS
    app.get('/update-product', async(req, res)=>{
      const products = productCollection.find();
      const result = await products.toArray();
      res.send(result);
    })

    app.get('/update-product/:id', async(req, res)=>{
      console.log(req.params.id);
      const id = req.params.id;
      console.log('printing from server', id);
      const query = {_id: new ObjectId(id)}
      const result = await productCollection.findOne(query);
      res.send(result);
    })

    // MODERATOR APIs
    // REVIEW QUEUE PAGE SORTED ALL PRODUCTS
    app.get('/products-review-queue', async(req, res)=>{
      const result = await productCollection.find().sort({"status":-1}).toArray();
      res.send(result);
    })

    // REPORTED CONTENTS PAGE
    app.get('/reported-products', async(req, res)=>{
      const result = await productCollection.find({'reported':true}).toArray();
      res.send(result);
    })
   


    // INCREASE VOTE OF PRODUCT
    app.patch('/products/upvote/:id', async(req, res)=>{
        const id = req.params.id;
        const email = req.query.email;
        console.log(email);
        const filter = {_id: new ObjectId(id)};

        const updatedDoc = {
            $push: {upvote_count: email},
        }
        const result = await productCollection.updateOne(filter, updatedDoc);
        res.send(result);
    })

    // REPORT PRODUCT
    app.patch('/products/report/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};

      const updatedDoc = {
          $set: {'reported': true},
      }
    
      const result = await productCollection.updateOne(filter, updatedDoc);
      res.send(result);
  })

  // UPDATE USER ROLE
  app.patch('/users/:email', verifyToken, verifyAdmin, async(req, res)=>{
    const email = req.params.email;
    const role = req.query.role;
    const filter = {user_email: email};

    console.log(role);
    const updatedDoc = {
      $set: {'role': role},
    }

    const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
  })

  // MAKE FEATURED FROM PRODUCTS REVIEW QUEUE PAGE
  app.patch('/products/featured/:id', async(req, res)=>{
    const id = req.params.id;
    const filter = {_id: new ObjectId(id)};

    const updatedDoc = {
        $set: {'featured': true},
    }
  
    const result = await productCollection.updateOne(filter, updatedDoc);
    res.send(result);
})

   // ACCEPT PRODUCTS FROM PRODUCTS REVIEW QUEUE PAGE
   app.patch('/products/accepted/:id', async(req, res)=>{
    const id = req.params.id;
    const filter = {_id: new ObjectId(id)};

    const updatedDoc = {
        $set: {'status': 'accepted'},
    }
  
    const result = await productCollection.updateOne(filter, updatedDoc);
    res.send(result);
})

  // ACCEPT PRODUCTS FROM PRODUCTS REVIEW QUEUE PAGE
  app.patch('/products/rejected/:id', async(req, res)=>{
    const id = req.params.id;
    const filter = {_id: new ObjectId(id)};

    const updatedDoc = {
        $set: {'status': 'rejected'},
    }

    const result = await productCollection.updateOne(filter, updatedDoc);
    res.send(result);
  })

  // UPDATE FROM MY PRODUCTS
   app.put('/update-product/:id', async (req, res) => {
    const id = req.params.id;
    const filter = {_id: new ObjectId(id)};
    const options = {upsert:true};
    const updatedProduct = req.body;
    console.log(updatedProduct);
    const product = {
        $set:{
            product_name: updatedProduct.product_name, 
            product_image: updatedProduct.product_image,
            product_tags: updatedProduct.product_tags, 
            external_links: updatedProduct.external_links,
            description: updatedProduct.description
        }
    }

    const result = await productCollection.updateOne(filter, product, options)
    res.send(result);
})


  // ADDING USER TO DATABASE WHEN LOGGING IN
  app.post('/users', async(req, res)=>{
    const user = req.body;
    // insert email if user does not exist
    const query = {user_email:user.user_email};
    const existingUser = await userCollection.findOne(query);
    if(existingUser){
      return res.send({message: 'user already exists', insertedId: null})
    }
    const result = await userCollection.insertOne(user);
    res.send(result);
  })

  // ADD REVIEW FROM PRODUCT DETAILS PAGE
  app.post('/reviews', async(req, res)=>{
    const newReview = req.body;

    const result = await reviewCollection.insertOne(newReview);
    res.send(result);
  })

  // ADD PRODUCT FROM ADD PRODUCT PAGE
  app.post('/add-product', async(req, res)=>{
    const newProduct = req.body;
    // console.log(newProduct);

    const result = await productCollection.insertOne(newProduct);

    const updateDoc = {
      $inc: {product_add_count: 1},
    }
    const adderQuery = {user_email: newProduct.owner_email};
    const updatedProductAddedCount = await userCollection.updateOne(adderQuery, updateDoc);
    // res.send(result);
    res.status(200).json(result);
})

  // DELETE PRODUCT FROM MY PRODUCT PAGE
  app.delete('/add-product/:id', async(req, res)=>{
    const id = req.params.id;
    const query = {_id:new ObjectId(id)}
    const result = await productCollection.deleteOne(query);
    res.send(result);
  })

    {// SEARCHING BY TAG
    //  app.get('/all-products/search/:searchText', async(req, res)=>{
    //   const searchText = req.params.searchText;
    //   console.log(searchText);

    //   const page = parseInt(req.query.page);
    //   const size = parseInt(req.query.size);

    //   const regex = new RegExp(searchText, 'i');

    //   // search query
    //   const query = {
    //     product_tags: { $in: [regex] },
    //     status: "accepted"
    //   };
    //   console.log(query);

    //   const result = await productCollection.find(query).skip(page * size).limit(size).toArray();
    //   // const result = await cursor.toArray();

    //   console.log(result);
    //   res.send(result);
    // })
    }
 

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res)=>{
    res.send('TechHive server is running');
})

app.listen(port, ()=>{
    console.log(`TechHive server is running on port ${port}`);
})
