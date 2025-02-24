// controllers/courseMappingController.js
const db = require('../config/db'); 

// Controller function to get course mapping data
exports.getCourseMappingData = async (req, res) => {
  const { departmentId, semcode } = req.query;
  console.log(req.query);
  
  const sqlQuery = `
    SELECT 
      GROUP_CONCAT(bcm.id ORDER BY mc.course_name SEPARATOR ', ') AS mapping_ids,
      DATE_FORMAT(bcm.start_date, '%Y-%m-%d') AS start_date,
      DATE_FORMAT(IFNULL(bcm.end_date, bcm.start_date), '%Y-%m-%d') AS end_date,
      GROUP_CONCAT(mc.course_name ORDER BY mc.course_name SEPARATOR ', ') AS courses,
      GROUP_CONCAT(bcm.paper_count ORDER BY mc.course_name SEPARATOR ', ') AS totalCount,
      mf.name AS chiefExaminer,
      mf.id AS chiefExaminerId
    FROM 
      board_course_mapping bcm
    JOIN 
      master_courses mc ON bcm.course = mc.id
    JOIN 
      master_faculty mf ON bcm.in_charge = mf.id
    WHERE  
      mc.status = '1' 
      AND mf.status = '1' 
      AND bcm.department = ?
      AND bcm.semcode = ?
    GROUP BY 
      bcm.in_charge, 
      bcm.start_date, 
      bcm.end_date, 
      mf.name, 
      mf.id;
  `;

  try {
    const [rows] = await db.query(sqlQuery, [departmentId, semcode]);
    
    // Format the data to match the desired output format
    const result = rows.map(row => ({
      mapping_ids: row.mapping_ids.split(', '),  // Split the concatenated mapping IDs into an array
      start_date: row.start_date,
      end_date: row.end_date,
      courses: row.courses.split(', '),  // Split the concatenated course names into an array
      totalCount: row.totalCount.split(', ').map(Number),  // Split the concatenated counts into an array and convert to numbers
      chiefExaminer: [row.chiefExaminer],  // Chief Examiner's name is a single value
      chiefExaminerIds: [row.chiefExaminerId]  // Chief Examiner's ID is a single value
    }));
    console.log(result)
    res.json(result);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


exports.createBoardCourseMapping = async (req, res) => {
  const { department, course, paper_count, semcode, batch, start_date, end_date, in_charge, time_in_days, status } = req.body;
  
  try {
    const [result] = await db.query(
      'INSERT INTO board_course_mapping (department, course, paper_count, semcode, batch, start_date, end_date, in_charge, time_in_days, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [department, course, paper_count, semcode, batch, start_date, end_date, in_charge, time_in_days, status]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Read (Single)
exports.getBoardCourseMapping = async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.query('SELECT * FROM board_course_mapping WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Read (All)
exports.getAllBoardCourseMappings = async (req, res) => {
  const { department, semcode } = req.query;
  try {
    const [rows] = await db.query('SELECT * FROM board_course_mapping WHERE department=? AND semcode=?', []);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update
exports.updateBoardCourseMapping = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  console.log(updates)
  // Check if there's any data to update
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No data provided for update' });
  }

  // Construct the SQL query dynamically
  const setClause = Object.keys(updates)
    .map(key => `${key} = ?`)
    .join(', ');

  const values = [...Object.values(updates), id];

  try {
    const [result] = await db.query(
      `UPDATE board_course_mapping SET ${setClause} WHERE id = ?`,
      values
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.status(200).json({ message: 'Record updated successfully' });
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: error.message });
  }
};


// Delete
exports.deleteBoardCourseMapping = async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.query('DELETE FROM board_course_mapping WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCoursesWithNullFields = async(req, res) => {
  console.log("sending courses")
  const query = `
    SELECT mc.id, mc.course_code,bcm.paper_count
    FROM master_courses mc
    JOIN board_course_mapping bcm ON mc.id = bcm.course
    WHERE (bcm.start_date IS NULL OR bcm.end_date IS NULL OR bcm.in_charge IS NULL)
      AND bcm.department = ? 
      AND bcm.semcode = ?
  `;

  const department = req.query.department;
  const semcode = req.query.semcode; 

  // Execute the query
  const [result] = await db.query(query, [department, semcode]);
  console.log(result);
  res.json(result);(result);
};

exports.getFreeFaculties=async(req, res)=>{
  const { departmentId, startDate, endDate } = req.query;  // Get parameters from the query string

  if (!departmentId || !startDate || !endDate) {
    return res.status(400).json({ error: 'departmentId, startDate, and endDate are required' });
  }

  try {
    // Query to find free faculties
    const [rows] = await db.query(`
      SELECT mf.id, CONCAT(mf.name, ' - ', mf.faculty_id) AS faculty_name_code
      FROM master_faculty mf
      WHERE mf.department = ?
        AND mf.id NOT IN (
          SELECT DISTINCT in_charge
          FROM board_course_mapping
          WHERE (end_date >= ? AND start_date <= ?)
        );
    `, [departmentId, startDate, endDate]);

    console.log(rows)
    // Send the result as JSON
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching free faculties:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

exports.updateBoardCourseMappingByDetails = async (req, res) => {
  const { department, semcode, course } = req.query; // Get the parameters from the query string
  const updates = req.body; // Get the fields to be updated from the request body

  // Check if required parameters are provided
  if (!department || !semcode || !course) {
    return res.status(400).json({ message: 'department, semcode, and course are required to find the record' });
  }

  // Check if there's any data to update
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No data provided for update' });
  }

  try {
    // Step 1: Fetch the ID based on department, semcode, and course
    const [rows] = await db.query(
      `SELECT id FROM board_course_mapping WHERE department = ? AND semcode = ? AND course = ?`,
      [department, semcode, course]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Record not found for the provided department, semcode, and course' });
    }

    const { id } = rows[0]; // Retrieve the ID from the result

    // Step 2: Construct the SQL query dynamically for updating
    const setClause = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');

    const values = [...Object.values(updates), id];
    console.log(setClause,req.body)
    // Step 3: Execute the Update Query
    const [result] = await db.query(
      `UPDATE board_course_mapping SET ${setClause} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'No changes made to the record' });
    }

    res.status(200).json({ message: 'Record updated successfully' });

  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: error.message });
  }
};
