import { Button, Input } from '@mui/material'
import './Login.css'
import { GoogleLogin } from '@react-oauth/google';
import LoginImage from '../../assets/Login.png'
import {decodeToken} from 'react-jwt'
import { CookiesProvider, useCookies } from 'react-cookie'
import { replace, useNavigate } from 'react-router-dom';
import apiHost from '../../../config/config';
import axios from 'axios';
import { useEffect } from 'react';
const Login = ({setLoading})=>{
    const navigate = useNavigate();
    const [cookies, setCookie] = useCookies(['user','auth'])
    useEffect(()=>{
         if(cookies.auth){
            navigate('/paperallocation',{replace:true});
         }
    },[cookies.auth])
 
    const handleLogin = (response)=>{
        if(setLoading){
            setLoading(true);
        }
        setCookie('user',response.credential,{path:'/'})
        console.log(decodeToken(response.credential))
        const email =decodeToken(response.credential).email;
         axios.post(`${apiHost}/auth/login`,{email:email}).then((res)=>{
            console.log(res.data)
            setCookie('auth',res.data,{path:'/'});
            navigate('/paperallocation',{replace:true});
        })
        
    }
    return(
        <div className='loginPageContainer'>
            <div className='loginContainer'>
                    <h2>Welcome Back</h2>
                    <img className='loginImage' src={`
                    https://img.freepik.com/free-vector/graduation-cap-diploma-with-seal-3d-icon-hat-with-tassel-paper-scroll-with-badge-3d-vector-illustration-white-background-education-graduation-success-concept_74855-26002.jpg?t=st=1739374231~exp=1739377831~hmac=8adbcef8a5bdba4d5180dc04fee75cba502904f02a6d6eb60c5fb55a9e983196&w=1060` />
                    <GoogleLogin  
                    type='standard'
                    theme='filled_blue'
             size='large'
             width={"250"}
             
     onSuccess={handleLogin}/>
                    
            </div>
        </div>
    )
}
export default Login
