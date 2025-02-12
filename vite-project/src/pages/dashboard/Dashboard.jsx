import React, { useState, useEffect } from "react";
import { PieArcLabel } from "@mui/x-charts";
import {
  Add,
  Approval,
  ArrowBack,
  Cancel,
  ChangeCircle,
  Circle,
  Done,
  Edit,
  Info,
  NotificationAdd,
  Send,
} from "@mui/icons-material";
import "./Dashboard.css";
import axios from "axios";
import Button from "../../components/button/Button";
import apiHost from "../../../config/config";
import Select from "react-select";
import { useCookies } from "react-cookie";
import {
  Box,
  Modal,
  selectClasses,
  TextareaAutosize,
  TextField,
  useRadioGroup,
} from "@mui/material";
import NoData from "../../components/noData/NoData";
import StyledModal from "../../components/modal/StyledModal";
import { toast, ToastContainer } from "react-toastify";
import AreYouSure from "../../components/areYouSure/AreYouSure";
import AllocationSummary from "./allocationSummary/AllocationSummary";
import PieChartContainer from "./pieChart/PieChar";
import BoardDetails from "./boardDetails/BoardDetails";
const Dashboard = (props) => {
  const [selectData, setSelectData] = useState([]);
  const [semesterCodes, setSemesterCodes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [batchOptions, setBatchOptions] = useState([]);
  const [year, setYear] = useState("");
  const [yearOptions, setYearOptions] = useState([]);
  const [batch, setBatch] = useState("");
  const [departmentId, setDepartmentId] = useState(null);
  const [selectedSemesterCode, setSelectedSemesterCode] = useState("");

  const [chiefExaminers, setChiefExaminers] = useState([]);
  const [cookies, setCookie] = useCookies(["auth"]);
  const [roles, setRoles] = useState([]);
  const [hodDetails, setHodDetails] = useState({});
  const [sure, setSure] = useState(false);
  const [sureOpen, setSureOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [ceToBeDeleted, setCeToBeDeleted] = useState(null);
  const [totalPaperCount, setTotalPaperCount] = useState(0);


  useEffect(() => {
    console.log(reason);
  }, [reason]);

  const getTotalPaperCount = async (department, semcode, batch) => {
    axios
      .get(`${apiHost}/api/total-papers`, {
        params: {
          department,
          batch,
          semcode,
        },
        headers: {
          auth: cookies.auth,
        },
      })
      .then((res) => {
        console.log("Total Paper Count is : ", res.data);
        setTotalPaperCount(res.data?.total_papers);
      });
  };
  useEffect(() => {
    try {
      if (roles.includes("hod") && !roles.includes("coe")) {
        axios
          .get(`${apiHost}/auth/hodDetails`, {
            headers: {
              Auth: cookies.auth,
            },
          })
          .then((res) => {
            console.log(res.data[0]);
            setHodDetails(res.data[0]);
            setDepartmentId({ value: res.data[0]?.department });
          });
      }
    } catch (error) {
      console.error("Error fetching role:", error);
    }
  }, [cookies.auth, roles]);
  useEffect(() => {
    if (batch && selectedSemesterCode && departmentId) {
      getTotalPaperCount(
        departmentId?.value,
        selectedSemesterCode?.value,
        batch?.value
      );
    }
  }, [departmentId, selectedSemesterCode, batch]);

  useEffect(() => {
    console.log("Chief Examiners : ", chiefExaminers);
  }, [chiefExaminers]);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        if (cookies.auth) {
          const response = await axios.get(`${apiHost}/auth/role`, {
            headers: {
              auth: cookies.auth,
            },
          });
          setRoles(response.data.roles);
        }
      } catch (error) {
        console.error("Error fetching role:", error);
      }
    };

    fetchRole();
  }, [cookies.auth]);

  const updateBoardChiefExaminer = async (mapping_id, faculty_id) => {
    console.log(faculty_id);
    if (!mapping_id || !faculty_id) {
      return toast.error("Couldn't Change CE");
    } else {
      try {
        await axios
          .put(
            `${apiHost}/api/board-chief-examiner`,
            {
              id: mapping_id,
              faculty: faculty_id,
            },
            {
              headers: {
                auth: cookies.auth,
              },
            }
          )
          .then((res) => {
            if (res.status === 200) {
              toast.success(res.data.message);
              fetchBoardChiefExaminer();
            } else {
              toast.error(res.data.error || "Unable to Change CE");
            }
          });
      } catch (error) {
        return toast.error("Unable to Update CE");
      }
    }
  };

  useEffect(() => {
    console.log(departmentId);
  }, [departmentId]);

  const sendCeAddRequest = async (chief_examiner) => {
    if (!chief_examiner || !reason) {
      console.log(chief_examiner, reason);
      return toast.error("Insuffient Data");
    } else if (reason.trim() === "") {
      return toast.error("Please provide a reason");
    } else {
      try {
        await axios
          .post(
            `${apiHost}/api/board-chief-examiner-add-request`,
            {
              chief_examiner,
              board: departmentId.value,
              semcode: selectedSemesterCode.value,
              reason: reason,
            },
            {
              headers: {
                auth: cookies.auth,
              },
            }
          )
          .then((res) => {
            console.log(res);
            if (res.status === 201) {
              fetchBoardChiefExaminer();
              toast.success(res.data.message);
            } else {
              toast.error(res.data.message);
            }
          });
      } catch (error) {
        toast.error(error);
      }
    }
  };

  useEffect(() => {
    props.setTitle("Dashboard");
  }, []);

  

  useEffect(() => {
    const fetchSemesterCodes = async () => {
      if (!batch || !year) {
        return;
      }
      try {
        const response = await axios.get(
          `${apiHost}/api/semcodes?batch=${batch.value}&year=${year.value}`,
          {
            headers: {
              Auth: cookies.auth,
            },
          }
        );
        const parsedCodes = response.data.results.map((item) => ({
          value: item.id,
          label: item.semcode,
        }));
        setSemesterCodes(parsedCodes);
      } catch (error) {
        console.error("Error fetching semester codes:", error);
      }
    };

    fetchSemesterCodes();
  }, [batch, year, cookies.auth]);

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const response = await axios.get(`${apiHost}/years`, {
          headers: {
            Auth: cookies.auth,
          },
        });
        const parsedYears = response.data.map((item) => ({
          value: item.id,
          label: item.year,
        }));
        setYearOptions(parsedYears);
      } catch (error) {
        console.error("Error fetching years:", error);
      }
    };

    fetchYears();
  }, [cookies.auth]);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const response = await axios.get(`${apiHost}/batches`, {
          headers: {
            Auth: cookies.auth,
          },
        });
        const parsedBatches = response.data.map((item) => ({
          value: item.id,
          label: item.batch,
        }));
        setBatchOptions(parsedBatches);
      } catch (error) {
        console.error("Error fetching batches:", error);
      }
    };

    fetchBatches();
  }, [cookies.auth]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get(`${apiHost}/departments`, {
          headers: {
            Auth: cookies.auth,
          },
        });
        const parsedDepartments = response.data.map((item) => ({
          value: item.id,
          label: item.department,
        }));
        setDepartments(parsedDepartments);
      } catch (error) {
        console.error("Error fetching departments:", error);
      }
    };

    fetchDepartments();
  }, [cookies.auth]);

  useEffect(() => {
    console.log("triggered");
    if (sure) {
      handleRemoveCe(ceToBeDeleted);
    }
  }, [sure]);

  const handleRemoveCe = async (mapping_id) => {
    if (sure && mapping_id) {
      await axios
        .delete(`${apiHost}/api/board-chief-examiner`, {
          params: {
            id: mapping_id,
          },
          headers: {
            auth: cookies.auth,
          },
        })
        .then((res) => {
          if (res.status === 200) {
            toast.success(res.data.message);
            setSureOpen(false);
            setSure(false);
            fetchBoardChiefExaminer();
          }
        });
      setCeToBeDeleted(null);
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", padding: "10px 15px" }}>
      <AreYouSure
        setSure={() => {
          setSure(true);
        }}
        open={sureOpen}
        setOpen={setSureOpen}
        content={"On deleting a Chief Examiner"}
      />
      <ToastContainer />
      <div
        className="selectContainer"
        style={{
          padding: " 15px 10px",
          borderRadius: "5px",
          display: "flex",
          gap: "10px",
          justifyContent: "space-between",
          margin: "10px 0px",
        }}
      >
        {roles.includes("coe") && (
          <div style={{ width: "30%", float: "right" }}>
            <Select
              placeholder="Select Department"
              value={departmentId}
              onChange={(selectedOption) => setDepartmentId(selectedOption)}
              options={departments}
              isClearable
            />
          </div>
        )}

        <div style={{ width: "30%", float: "right" }}>
          <Select
            placeholder="Select Year"
            value={year}
            onChange={(selectedOption) => setYear(selectedOption)}
            options={yearOptions}
            isClearable
          />
        </div>
        <div style={{ width: "30%", float: "right" }}>
          <Select
            placeholder="Select Batch"
            value={batch}
            onChange={(selectedOption) => setBatch(selectedOption)}
            options={batchOptions}
            isClearable
          />
        </div>
        <div style={{ width: "30%", float: "right" }}>
          <Select
            placeholder="Select SemCode"
            value={selectedSemesterCode}
            onChange={(selectedOption) =>
              setSelectedSemesterCode(selectedOption)
            }
            options={semesterCodes}
            isClearable
          />
        </div>
      </div>
      {!selectedSemesterCode && <NoData />}
      {selectedSemesterCode && (
        <>
        
        <BoardDetails chiefExaminers={chiefExaminers} departmentId={departmentId.value} semesterCode={selectedSemesterCode.value}/>

          <div className="allocationDashboardContainer">
            <PieChartContainer
              semesterCode={selectedSemesterCode?.value}
              departmentId={departmentId?.value}
              chiefExaminers={chiefExaminers}
              roles={roles}
              setChiefExaminers={setChiefExaminers}
            />
            <AllocationSummary
              semesterCode={selectedSemesterCode?.value}
              departmentId={departmentId?.value}
            />
          </div>

         

      
        </>
      )}
    </div>
  );
};

export default Dashboard;
