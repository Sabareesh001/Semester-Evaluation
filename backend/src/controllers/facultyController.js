const db = require('../config/db'); 



exports.createFaculty = async (req, res) => {
    const { name, faculty_id, department, email, experience_in_bit, total_teaching_experience, date_of_joining, status } = req.body;

    // Validate required fields
    if (!name || !faculty_id || department == null || !email || experience_in_bit == null || total_teaching_experience == null || !status) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    // Validate data types
    if (typeof name !== 'string' || typeof faculty_id !== 'string' || typeof email !== 'string' || !Number.isInteger(department) || !Number.isInteger(experience_in_bit) || !Number.isInteger(total_teaching_experience) || !['0', '1'].includes(status)) {
        return res.status(400).json({ error: 'Invalid data types or values.' });
    }

    try {
        // Check if the faculty_id already exists
        const [existingFaculty] = await db.query('SELECT * FROM master_faculty WHERE faculty_id = ?', [faculty_id]);

        if (existingFaculty.length > 0) {
            // Update the existing faculty
            const updateQuery = `
                UPDATE master_faculty 
                SET name = ?, department = ?, email = ?, experience_in_bit = ?, total_teaching_experience = ?, date_of_joining = ?, status = ?
                WHERE faculty_id = ?
            `;
            const updateValues = [name, department, email, experience_in_bit, total_teaching_experience, date_of_joining, status, faculty_id];
            await db.query(updateQuery, updateValues);

            res.status(200).json({ message: 'Faculty details updated successfully', ...req.body });
        } else {
            // Insert new faculty
            const insertQuery = `
                INSERT INTO master_faculty (name, faculty_id, department, email, experience_in_bit, total_teaching_experience, date_of_joining, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const insertValues = [name, faculty_id, department, email, experience_in_bit, total_teaching_experience, date_of_joining, status];
            const [result] = await db.query(insertQuery, insertValues);

            res.status(201).json({ id: result.insertId, ...req.body });
        }
    } catch (error) {
        console.error('Error processing faculty data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};



exports.uploadEligibleFaculty = async (req, res) => {
    const facultyData = req.body;
    if (!Array.isArray(facultyData) || facultyData.length === 0) {
        return res.status(400).json({ message: 'Invalid data format. Expected an array of faculty records.' });
    }

    try {
        for (const faculty of facultyData) {
            const { facultyId, semcode, department } = faculty;

            if (facultyId == null || semcode == null || department == null) {
                return res.status(400).json({ message: 'Invalid faculty data. Faculty ID, semester code, and department are required.' });
            }

            const [rows] = await db.query(`
                SELECT id FROM master_faculty WHERE faculty_id = ?
            `, [facultyId]);

            if (rows.length === 0) {
                return res.status(404).json({ message: `Faculty ID ${facultyId} not found in master_faculty.` });
            }

            const actualFacultyId = rows[0].id;

            await db.query(`
                INSERT INTO eligible_faculty (faculty, semcode, department) 
                VALUES (?, ?, ?)
            `, [actualFacultyId, semcode, department]);
        }

        res.status(201).json({ message: 'Eligible faculty data uploaded successfully.' });
    } catch (error) {
        console.error('Error uploading eligible faculty data:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

exports.allocateFaculty =  async (req, res) => {
    const { facultyId, courseId, paperCount, semCode,handledBy,time,handlingFacultyRole,departmentId} = req.body[0];
    console.log(req.body[0])
    if (facultyId == null || courseId == null || paperCount == null || semCode == null) {
        return res.status(400).json({ message: 'All fields are required: faculty, course, paper_count, and semCode' });
    }
    function roundToHalfOrCeiling(value) {
        const roundedValue = Math.round(value * 2) / 2;
        return roundedValue < value ? roundedValue + 0.5 : roundedValue;
    }
    const existingPaperCountQuery = `
    SELECT SUM(paper_count) existingPaperCount FROM faculty_paper_allocation WHERE faculty =  ? AND semcode = ?
    `
    try {
        const [result] = await db.query(existingPaperCountQuery,[facultyId,semCode])
        console.log(result[0].existingPaperCount)
        console.log("roundoff : "+roundToHalfOrCeiling((parseInt(result[0].existingPaperCount)+paperCount)/50))
        console.log({time:time,roundOff:roundToHalfOrCeiling((parseInt(result[0].existingPaperCount)+paperCount)/50)})
        console.log(roundToHalfOrCeiling((parseInt(result[0].existingPaperCount)+paperCount)/50)>time)
        if(roundToHalfOrCeiling((parseInt(result[0].existingPaperCount)+paperCount)/50)>time){
            return res.status(400).json({message:`Faculty Allocation is more than ${time} days Overall the semester try reducing the paper count or adding faculty`})
        }
    } catch (error) {
        console.error('Error processing faculty paper allocation:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
    const overallPaperInSemesterQuery = `SELECT SUM(paper_count) totalPaperInSem FROM board_course_mapping WHERE department =? AND semcode = ?`
    try {
        const [result] = await db.query(overallPaperInSemesterQuery,[departmentId,semCode]);
        if(roundToHalfOrCeiling(parseInt(result[0].totalPaperInSem)/time)<251){
               if(handlingFacultyRole=='CE'){
                return res.status(400).json({message:"You Cannot Appoint CE until BC have more than 251 paper per day"})
               }
        }
    } catch (error) {
        console.error('Error processing faculty paper allocation:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
    const checkQuery = `
        SELECT * FROM faculty_paper_allocation 
        WHERE faculty = ? AND course = ? AND semcode = ?
    `;

    try {
        const [existingAllocations] = await db.query(checkQuery, [facultyId, courseId, semCode]);

        if (existingAllocations.length > 0) {
            // Record already exists, ignore insertion
            return res.status(200).json({ message: 'Allocation already exists. Ignored.' });
        }

        const insertQuery = `
            INSERT INTO faculty_paper_allocation (faculty, course, paper_count, semcode) 
            VALUES (?, ?, ?, ?)
        `;
        const [insertResult] = await db.query(insertQuery, [facultyId, courseId, paperCount, semCode]);
        res.status(201).json({ message: 'Faculty paper allocation added successfully', allocationId: insertResult.insertId });

    } catch (error) {
        console.error('Error processing faculty paper allocation:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

exports.checkOldFaculty = async (req, res) => {
    const { old_faculty, semcode,course } = req.query;
    // SQL query to get the status of old_faculty for the given semcode
    const checkFacultyQuery = `
        SELECT status 
        FROM faculty_change_requests 
        WHERE old_faculty = ? 
        AND semcode = ?
        AND course = ?
        LIMIT 1;
    `;

    try {
        const [result] = await db.query(checkFacultyQuery, [old_faculty, semcode,course]);

        if (result.length === 0) {
            return res.status(200).json({ code: 0, message: 'No record found for the given old_faculty and semcode.' });
        }
        
        const status = result[0].status;
        let code;
        switch (status) {
            case '0':
                code = 1;
                break;
            case '1':
                code = 2;
                break;
            case '2':
                code = 3;
                break;
            default:
                code = 0;
                break;
        }
        res.status(200).json({ code, message: `Status code: ${code}` });
    } catch (error) {
        console.error('Error checking old faculty status:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

exports.getFaculty = async (req, res) => {
    const { excludeId, department, status, facultyId, name } = req.query;
    let excludeIds;

    try {
        // If excludeId is provided, convert it to an array
        if (excludeId) {
            excludeIds = Array.isArray(excludeId) ? excludeId : [excludeId];
        }

        // Base query to fetch the minimum id per faculty_id
        let query = `
            SELECT *, faculty_id, CONCAT(faculty_id, ' - ', name) AS faculty_info, name, department, status
            FROM master_faculty
            WHERE id IN (
                SELECT MIN(id)
                FROM master_faculty
                GROUP BY faculty_id
            )
        `;

        // Parameters for the query
        let queryParams = [];

        // Dynamic WHERE clauses
        let whereClauses = [];

        // Add filtering by department if provided
        if (department) {
            whereClauses.push('department = ?');
            queryParams.push(department);
        }

        // Add filtering by status if provided
        if (status) {
            whereClauses.push('status = ?');
            queryParams.push(status);
        }

        // Add filtering by faculty_id if provided
        if (facultyId) {
            whereClauses.push('faculty_id = ?');
            queryParams.push(facultyId);
        }

        // Add filtering by name if provided
        if (name) {
            whereClauses.push('name LIKE ?');
            queryParams.push(`%${name}%`);
        }

        // Add the dynamic WHERE clauses to the main query
        if (whereClauses.length > 0) {
            query += ' AND ' + whereClauses.join(' AND ');
        }

        // If excludeIds are provided, exclude them from the results
        if (excludeIds) {
            query += ` AND id NOT IN (${excludeIds.map(() => '?').join(', ')})`;
            queryParams = queryParams.concat(excludeIds);
        }

        // Final query with sorting
        query += ` ORDER BY faculty_id;`;

        // Execute the query with provided parameters
        const [rows] = await db.query(query, queryParams);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching faculty data:', error);
        res.status(500).json({ error: 'An error occurred while fetching faculty data' });
    }
};


exports.getFacultyById = async(req, res) => {
    const facultyId = req.params.id; // Extract the faculty ID from the request parameters
   
    // SQL query to get faculty details by ID
    const query = `SELECT * FROM master_faculty WHERE id = ? AND status = '1'`; // Fetch only active faculty
  
    // Execute the query using the pool
    const [results]  = await db.query(query, [facultyId]);
    console.log(results[0])
      res.json(results[0]);
  };


  
  // controllers/facultyController.js

exports.updateFacultyById = async (req, res) => {
    const { id } = req.params;
    const fields = req.body; // Fields to update from request body
  
    // Check if there are fields to update
    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }
  
    // Dynamically create query parts
    const setClause = Object.keys(fields)
      .map((field) => `${field} = ?`)
      .join(', ');
    const values = Object.values(fields);
  
    try {
      // Build dynamic SQL query
      const query = `UPDATE master_faculty SET ${setClause} WHERE id = ?`;
      values.push(id); // Add ID to the end of the values array
  
      const [result] = await db.query(query, values);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Faculty not found' });
      }
  
      res.status(200).json({ message: 'Faculty updated successfully', id, ...fields });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  

  exports.deleteFaculty = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM master_faculty WHERE id = ?', [id]);
        
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Faculty record deleted successfully.' });
        } else {
            res.status(404).json({ message: 'Faculty record not found.' });
        }
    } catch (error) {
        res.status(230).json({ message: error });
    }
}