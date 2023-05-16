const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
var jwt = require('jsonwebtoken');
const PORT = process.env.PORT || 5000

const app = express()

// middleware
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

// MongoDB Database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.h88b4w7.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyJWT = (req, res, next) => {

  const authorization = req.headers.authorization
  if (!authorization) {
    return res.status(401).send({ error: true, message: "Unauthoried access" })
  }

  const token = authorization.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRECT, (err, decoded) => {
    if(err){
      return res.status(403).send({error:true, message: "unautoried access"})
    }

    req.decoded = decoded
    next()
  });

  console.log(token);
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const serviceCollection = client.db("carDoctorDB").collection("services")
    const bookingCollection = client.db("carDoctorDB").collection("bookings")

    // jwt
    app.post('/token', (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRECT, {
        expiresIn: "1h"
      })

      const result = { token }

      res.send(JSON.stringify(result))
    })

    // Service Route
    app.get('/services', async (req, res) => {

      const result = await serviceCollection.find().toArray()
      res.send(result)
    })

    app.get('/services/:_id', async (req, res) => {

      const _id = req.params._id
      const service = await serviceCollection.findOne({ _id: new ObjectId(_id) })
      res.send(service)
    })

    app.get('/checkout/:_id', async (req, res) => {

      const _id = req.params._id

      const option = {
        projection: {
          title: 1,
          price: 1,
          img: 1,
        }
      }

      const service = await serviceCollection.findOne({ _id: new ObjectId(_id) }, option)
      res.send(service)
    })

    app.get('/bookings', verifyJWT, async (req, res) => {

      // const user = req.headers.authorization
      // console.log(user);

      let query = {}
      if (req.query?.email) {
        query = {
          email: req.query.email
        }
      }

      const result = await bookingCollection.find(query).toArray()
      console.log(result);
      res.send(result)
    })

    app.post('/bookings', async (req, res) => {

      const booking = req.body
      const result = await bookingCollection.insertOne(booking)
      console.log(booking);
      res.send(result)
    })

    app.patch('/bookings/:_id', async (req, res) => {
      const _id = req.params._id

      const filter = { _id: new ObjectId(_id) }
      const updateBooking = req.body

      const updateDoc = {
        $set: {
          status: updateBooking.status
        },
      };

      const result = await bookingCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.delete('/bookings/:_id', async (req, res) => {
      const _id = req.params._id

      const query = { _id: new ObjectId(_id) }
      const result = await bookingCollection.deleteOne(query)
      res.send(result)
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


app.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}`);
})