require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 9000;
const app = express();

app.use(cors({ origin: ['http://localhost:5173'], credentials: true }));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nghoa.mongodb.net/myDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = (req, res, next) => {};

async function run() {
  try {
    const database = client.db('job-nestDB');
    const jobCollection = database.collection('jobs');
    const bidCollection = database.collection('bids');

    // create jwt token
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: '1h' });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: false, //for development environment
          sameSite: 'strict',
        })
        .send({ status: 'success' });
    });
    // clear jwt token
    app.get('/clear-jwt', async (req, res) => {
      res
        .clearCookie('token', {
          secure: false, //for development environment
          sameSite: 'strict',
        })
        .send({ message: 'clear cookie......' });
    });
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

    // get all job for all job page
    app.get('/all-jobs', async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search;
      const sort = req.query.sort;
      let options = {};

      if (sort)
        options = {
          sort: { deadline: sort === 'asc' ? 1 : -1 },
        };

      let query = {
        job_title: {
          $regex: search,
          $options: 'i',
        },
      };
      if (filter) query.category = filter;
      const result = await jobCollection.find(query, options).toArray();
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
      console.log(req.cookies);

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

    // change the bid status
    app.patch('/bids/:id', async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const query = { _id: new ObjectId(id) };
      const updatedBit = {
        $set: { status },
      };
      const result = await bidCollection.updateOne(query, updatedBit);
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
