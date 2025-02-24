// controllers/boardCourseController.js
const db = require("../config/db");

// Create a new board course mapping
exports.createBoardCourseMapping = async (req, res) => {
  try {
    const { department, course, paper_count, semcode, batch, type, status } =
      req.body;
    const query =
      "INSERT INTO board_course_mapping (department, course, paper_count, semcode, batch, type, status) VALUES (?, ?, ?, ?, ?, ?, ?)";
    const [result] = await db.execute(query, [
      department,
      course,
      paper_count,
      semcode,
      batch,
      type,
      status,
    ]);
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error("Error inserting data:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get a board course mapping by ID
exports.getBoardCourseMapping = async (req, res) => {
  try {
    const queryParams = req.query;
    let query = `
      SELECT bcm.*, 
             mc.course_code, 
             md.department AS department_name 
      FROM board_course_mapping bcm
      LEFT JOIN master_courses mc ON bcm.course = mc.id
      LEFT JOIN master_department md ON bcm.department = md.id
      WHERE 1=1
    `;
    const values = [];

    // Construct query based on query parameters
    for (const [key, value] of Object.entries(queryParams)) {
      query += ` AND bcm.${key} = ?`;
      values.push(value);
    }

    const [rows] = await db.execute(query, values);
    if (rows.length === 0) {
      res.status(404).json({ error: "No records found" });
      return;
    }
    res.status(200).json(rows);
  } catch (err) {
    console.error("Error fetching data:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update a board course mapping by ID
exports.updateBoardCourseMapping = async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;

    let query = "UPDATE board_course_mapping SET ";
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      query += `${key} = ?, `;
      values.push(value);
    }
    query = query.slice(0, -2); // Remove trailing comma and space
    query += " WHERE id = ?";
    values.push(id);

    const [result] = await db.execute(query, values);
    if (result.affectedRows === 0) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.status(200).json({ message: "Record updated successfully" });
  } catch (err) {
    console.error("Error updating data:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Delete a board course mapping by ID
exports.deleteBoardCourseMapping = async (req, res) => {
  try {
    const id = req.params.id;
    const query = "DELETE FROM board_course_mapping WHERE id = ?";
    const [result] = await db.execute(query, [id]);
    if (result.affectedRows === 0) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.status(200).json({ message: "Record deleted successfully" });
  } catch (err) {
    console.error("Error deleting data:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getUnmappedCourses = async (req, res) => {
  const { semcode, batch, board } = req.query;

  if (!semcode || !batch || !board) {
    return res
      .status(400)
      .json({ error: "Please provide semcode, batch, and board." });
  }

  try {
    const query = `
      SELECT mc.id, mc.course_code
      FROM master_courses mc
      LEFT JOIN board_course_mapping bcm
      ON mc.id = bcm.course
      AND bcm.semcode = ?
      AND bcm.batch = ?
      AND bcm.department = ?
      WHERE bcm.id IS NULL
    `;

    // Use Promise-based query execution
    const [results] = await db.execute(query, [semcode, batch, board]);

    // Send the results back to the client
    res.json(results);
  } catch (err) {
    // Handle any errors
    res.status(500).json({ error: err.message });
  }
};
