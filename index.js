const express = require('express');
const app = express();
const cors = require('cors');
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


    // PRODUCTS API
    app.get('/products', async(req, res)=>{
        const result = await productCollection.find().toArray();
        res.send(result);
    })

    // FEATURED SECTION
    app.get('/featured', async(req, res)=>{
      const result = await productCollection.find({featured:true}).sort({"timestamp":-1}).toArray();
      console.log(result);
      res.send(result);
  })

    // TRENDING SECTION
    app.get('/trending', async(req, res)=>{
      const result = await productCollection.find().sort({"upvote_count":-1}).limit(6).toArray();
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

    // ALL ACCEPTED PRODUCTS FOR PRODUCTS PAGE
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

    // GETTING THE TOTAL NUMBER/COUNT OF ACCEPTED PRODUCTS FOR PRODUCTS PAGE PAGINATION
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

   
     // SEARCHING BY TAG
     app.get('/all-products/search/:searchText', async(req, res)=>{
      const searchText = req.params.searchText;
      console.log(searchText);

      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);

      const regex = new RegExp(searchText, 'i');

      // search query
      const query = {
        product_tags: { $in: [regex] },
        status: "accepted"
      };
      console.log(query);

      const result = await productCollection.find(query).skip(page * size).limit(size).toArray();
      // const result = await cursor.toArray();

      console.log(result);
      res.send(result);
    })


    // INCREASE VOTE OF PRODUCT
    app.patch('/products/upvote/:id', async(req, res)=>{
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};

        const updatedDoc = {
            $inc: {upvote_count: 1},
        }
        const result = await productCollection.updateOne(filter, updatedDoc);
        res.send(result);
    })

    // REPORT PRODUCT
    app.patch('/products/report/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};

      const updatedDoc = {
          $set: {'reported': "true"},
      }
    
      const result = await productCollection.updateOne(filter, updatedDoc);
      res.send(result);
  })



  // ADD REVIEW FROM PRODUCT DETAILS PAGE
  app.post('/reviews', async(req, res)=>{
    const newReview = req.body;

    const result = await reviewCollection.insertOne(newReview);
    res.send(result);
  })

    

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
