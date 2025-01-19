const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const port = process.env.PORT || 9000;
const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nghoa.mongodb.net/myDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const database = client.db('job-nestDB');
    const jobCollection = database.collection('jobs');
    const bidCollection = database.collection('bids');

    // job related api
    // post a job in data base
    app.post('/jobs', async (req, res) => {
      const job = req.body;
      const result = await jobCollection.insertOne(job);
      res.send(result);
    });

    // get all jobs from data base
    app.get('/jobs', async (req, res) => {
      const result = await jobCollection.find().toArray();
      res.send(result);
    });

    // Step 1: API to fetch a specific job by ID (GET API)
    app.get('/job/:id', async (req, res) => {
      const id = req.params.id; // Extract the job ID from the request parameters
      const query = { _id: new ObjectId(id) }; // Find the job in the database
      const job = await jobCollection.findOne(query);
      res.send(job); // Send the job data back to the client
    });

    // Step 2: API to update a job by ID (PUT API)
    app.put('/job/:id', async (req, res) => {
      const id = req.params.id; // Extract the job ID
      const updatedData = req.body; // Get the updated data from the request body

      // Update the job in the database
      const filter = { _id: new ObjectId(id) }; // Filter: Find the job by ID
      const updateJob = { $set: updatedData }; // Update: Set the new data
      const option = { upsert: true }; // optional line
      const result = await jobCollection.updateOne(filter, updateJob, option);

      res.send(result); // Send the update result back to the client
    });

    // get jobs based on user
    app.get('/jobs/:email', async (req, res) => {
      const email = req.params.email;
      const query = { 'buyer.email': email };
      const result = await jobCollection.find(query).toArray();
      res.send(result);
    });

    // delete job
    app.delete('/job/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.deleteOne(query);
      res.send(result);
    });

    //bid collection related apis
    app.post('/bids', async (req, res) => {
      const bid = req.body;

      // if same parson
      const query = { email: bid.email, jobId: bid.jobId };
      const isExist = await bidCollection.findOne(query);
      if (isExist) {
        return res
          .status(400)
          .send({ message: 'you have already bid on this job..' });
      }

      const result = await bidCollection.insertOne(bid);

      // increase the bid number
      const filter = { _id: new ObjectId(bid.jobId) };
      const updateDoc = {
        $inc: { total_bids: 1 },
      };
      const updatedJob = await jobCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // get bids based on user
    app.get('/bids/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await bidCollection.find(query).toArray();
      res.send(result);
    });

    // get bids based on user
    app.get('/bid-request/:email', async (req, res) => {
      const email = req.params.email;
      const query = { buyer: email };
      const result = await bidCollection.find(query).toArray();
      res.send(result);
    });

    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from SoloSphere Server....');
});

app.listen(port, () => console.log(`Server running on port:: ${port}`));
