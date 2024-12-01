const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const propertiesReader = require('properties-reader');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();

// Load properties from the properties file
const propertiesPath = path.resolve(__dirname, 'conf/db.properties'); // Adjust the path if needed
const properties = propertiesReader(propertiesPath);

// Read database connection properties
let dbPrefix = properties.get("db.prefix");
let dbUsername = encodeURIComponent(properties.get("db.user"));
let dbPwd = encodeURIComponent(properties.get("db.pwd"));
let dbName = properties.get("db.dbName");
let dbUrl = properties.get("db.url");
let dbParams = properties.get("db.params");

// Construct the MongoDB connection URI
const uri = `${dbPrefix}${dbUsername}:${dbPwd}${dbUrl}${dbParams}`;
console.log("MongoDB Connection URI:", uri);

// Initialize MongoDB client
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
let db;


// Express setup
app.set('json spaces', 3);
app.use(cors());
app.use(morgan("short"));
app.use(express.json());

// Middleware to log incoming requests
app.use((req, res, next) => {
  console.log("Incoming request: " + req.url);
  next();
});

// Middleware to attach collection to request
app.param('collectionName', (req, res, next, collectionName) => {
  if (db) {
    req.collection = db.collection(collectionName);
    next();
  } else {
    res.status(500).send("Database not connected");
  }
});

// Routes
app.get('/', (req, res) => {
  res.send('Select a collection, e.g., /collections/products');
});

// Get all documents in a collection
app.get('/collections/:collectionName', async (req, res, next) => {
  try {
    if (!req.collection) {
      console.error("Collection not found");
      return res.status(500).send("Collection not found");
    }

    const results = await req.collection.find({}).toArray();
    
    if (results.length === 0) {
      console.log("No documents found in the collection");
    }

    res.json(results);
  } catch (err) {
    console.error("Error retrieving data:", err.message);
    res.status(500).send("Error retrieving data");
  }
});


// Get limited and sorted documents from a collection
app.get('/collections/:collectionName/:max/:sortAspect/:sortAsDesc', (req, res, next) => {
  const max = parseInt(req.params.max, 10);
  const sortDirection = req.params.sortAsDesc === "desc" ? -1 : 1;

  req.collection.find({})
    .limit(max)
    .sort({ [req.params.sortAspect]: sortDirection })
    .toArray((err, results) => {
      if (err) return next(err);
      res.send(results);
    });
});

// Get a document by ID
app.get('/collections/:collectionName/:id', (req, res, next) => {
  req.collection.findOne({ _id: new ObjectId(req.params.id) }, (err, result) => {
    if (err) return next(err);
    res.send(result);
  });
});

// Insert a new document into a collection
app.post('/collections/:collectionName', async (req, res) => {
    console.log("Received POST request with data:", req.body);
    try {
      const result = await req.collection.insertOne(req.body);
      console.log("Document inserted:", result);
      res.status(201).json({ message: "Document inserted", result });
    } catch (err) {
      console.error("Error inserting document:", err.message);
      res.status(500).json({ error: "Failed to insert document" });
    }
  });

  // Insert a new order into the orders collection
app.post('/collections/orders', async (req, res) => {
    console.log("Received order data:", req.body);
    const { name, phoneNumber, lessonIDs, spaces } = req.body;

    // Validate the incoming data
    if (!name || !phoneNumber || !Array.isArray(lessonIDs) || lessonIDs.length === 0 || !spaces) {
        return res.status(400).json({ error: "Invalid order data" });
    }

    try {
        const result = await req.collection.insertOne(req.body);
        console.log("Order inserted:", result);
        res.status(201).json({ message: "Order successfully placed", result });
    } catch (err) {
        console.error("Error inserting order:", err.message);
        res.status(500).json({ error: "Failed to place order" });
    }
});


// Delete a document by ID
app.delete('/collections/:collectionName/:id', async (req, res) => {
    try {
      const result = await req.collection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.json(result.deletedCount === 1 ? { msg: "success" } : { msg: "Document not found" });
    } catch (err) {
      console.error("Error deleting document:", err.message);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

// Update a document by ID
app.put('/collections/:collectionName/:id', async (req, res) => {
    try {
      const result = await req.collection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body }
      );
      res.json(result.matchedCount === 1 ? { msg: "success" } : { msg: "Document not found" });
    } catch (err) {
      console.error("Error updating document:", err.message);
      res.status(500).json({ error: "Failed to update document" });
    }
  });
  // Update any attribute in a lesson document by its ID
app.put('/collections/orders/:id', async (req, res) => {
    const lessonId = req.params.id;
    const updateData = req.body;

    try {
        // Ensure that updateData contains at least one field to update
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update" });
        }

        const result = await req.collection.updateOne(
            { _id: new ObjectId(lessonId) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Lesson not found" });
        }

        res.json({ message: "Lesson updated successfully", result });
    } catch (err) {
        console.error("Error updating lesson:", err.message);
        res.status(500).json({ error: "Failed to update lesson" });
    }
});



  app.use((req, res) => {
    res.status(404).send("Resource not found!");
  });

async function startServer() {
    try {
      await client.connect(); // Connect to MongoDB
      db = client.db(dbName);
      console.log("Connected to MongoDB successfully");
  
      const PORT = 3000;
      app.listen(PORT, () => {
        console.log(`Server started on port ${PORT}`);
      });
    } catch (err) {
      console.error("Error connecting to MongoDB:", err.message);
      process.exit(1); // Exit the process with an error status
    }
  }
  
  // Start the server only after successful database connection
  startServer();
