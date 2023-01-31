require ("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require("lodash");
const { iteratee } = require("lodash");
const app = express();
const port = process.env.PORT || 9000;
mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGODB_URI);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.listen(port, function () {
  console.log("BIG BROTHER is WATCHING YOU at LH: " + port);
});

const taskSchema = new mongoose.Schema({
  name: String,
});
const Task = mongoose.model("Task", taskSchema);
const permanentTasks = [
  {name: "Morning exercise"},
  {name: "Sewing"},
  {name: "5 page a day"},
  {name: "Before-bed check"}
];

//need to create Schema for dynamicly created routes, all global consts must be accessible before app.any

const listSchema = {
  name: String,
  tasks: [taskSchema], //all created tasks will go to tasks (all, except "/")
};

const List = mongoose.model("List", listSchema);

app.get("/", function (req, res) {
  //if statement created to prevent multiple creation of the same items within 1 collection//foundItems = items that were found during search //check correct typo ({}, function(){})
  //need to create IF statement to prevent creating of multiple copies of permItems
  Task.find({}, function (err, foundTasks) {
    if (foundTasks.length === 0) {
      //.length used to convert array to number (0=no objects, 1 = object created and so on) and to able to perform IF check
      Task.insertMany(permanentTasks, function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log("Permanent tasks succesfully added");
        }
        //after adding permanent tasks which was pre-written we redirect and checking again
        res.redirect("/");
      });
    } else { 
      //after redirecting and checking from start of page/function, we render ejs page and fill up page with all elements/components of HTML
      res.render("toDoList", {
        listTitle: "Better Me",
        newListTasks: foundTasks, // key newListItems corresponds as a const newListItems = [foundItems] and thats why it used as an <array> in list.js
      });
    }
  });
});

app.get("/:dynamicList", function (req, res) {
  const dynamicList = _.capitalize(req.params.dynamicList);

  //adding route to DB

  List.findOne({ name: dynamicList }, function (err, foundList) {
    if (err) {
      console.log(err);
    } else {
      if (!foundList) {
        //if Route which we are checking doesnt exist
        const newList = new List({
          name: dynamicList, //name will be given as per name provided in /route in address line
          tasks: permanentTasks, // all permanent pre-written tasks will be automatically added after new List created and .save() triggered
        });
        newList.save(function (err, savedList) {
          if (err) {
            console.log(err);
          } else {
            res.redirect("/" + dynamicList); //redirect to requested route
          }
        });
      } else {
        //when if statement created new route in DB , it redirects to beggining of page , then doing second check for created route and when it finds it (even if it was just created), it will proceed to else statement and render ejs file
        res.render("toDoList", {
          listTitle: foundList.name, //used to open page with dynamically created name (/:Work, etc)
          newListTasks: foundList.tasks, //used to tap into dynamicly created list and print tasks into dynamic route/page
        });
      }
    }
  });
});

app.post("/", function (req, res) {
  const taskName = req.body.newTask; //tapping into input's name to print Tasks which user placed in input
  const listName = req.body.list; //tapping into button's name to check what list name used at the moment
  const taskInput = new Task({ name: taskName }); //value taken from post requested which created when we submit input via button

  if (listName === "Better Me") { //if root route used we just add tasks directly to main/root list 
    taskInput.save(function (err, savedInput) {
      if (err) {
        console.log(err);
      } else {
        res.redirect("/");
      }
    });
  } else {
    List.findOne({ name: listName }, function (err, foundList) { //case when dynamic route created. First of all we search for name of newly created dynamic list 
      foundList.tasks.push(taskInput); //all newly created lists's task will be saved in corresponding List with tasksSchema (see line 33)
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

app.post("/delete", function (req, res) {
  const checkedTask = req.body.checkedTask; //checking what Task was marked as done (checked), so we know it should be deleted
  const routeInUse = req.body.routeInUse; //checked where we are now (what list user working on) (ref to form "/delete" in ejs.)

  if (routeInUse === "Better Me") { //if its root route , we just tap inton checked item, checking it by id.name and delete
    Task.findByIdAndRemove(checkedTask, function (err, foundTasks) {
      if (!err) {
        console.log("Task deleted");
        res.redirect("/");
      }
    });
  } else { //if its a dynamic list
    List.findOneAndUpdate(
      { name: routeInUse },
      { $pull: { tasks: { _id: checkedTask } } }, //$pull: (remove) task saved in tasks: by id number provided with checkedTask name + value
      function (err, foundRoutes) {
        if (err) {
          console.log(err);
        } else {
          res.redirect("/" + routeInUse);
        }
      }
    );
  }
});
