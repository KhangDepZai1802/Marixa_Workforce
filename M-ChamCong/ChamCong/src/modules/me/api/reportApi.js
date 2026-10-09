import axiosClient from "../../../services/api/axiosClient";

const reportApi = {
    mine: () => axiosClient.get("/EmployeeReport/mine"),
    submit: (form) => axiosClient.post("/EmployeeReport/submit", form, { headers: { "Content-Type": "multipart/form-data" } }),
    download: (versionId) => axiosClient.get(`/EmployeeReport/download/${versionId}`, { responseType: "blob" }),
    downloadAttachment: (id) => axiosClient.get(`/EmployeeReport/download-attachment/${id}`, { responseType: "blob" }),
};

export default reportApi;
