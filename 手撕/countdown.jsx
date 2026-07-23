const { useState, useEffect } = require("react")

const CountDown = ({initialTime,wait = 1000}) =>{
    const [time,setTime]  = useState(initialTime)
    
    useEffect(() =>{
    if(time <= 0) return 

    const timer = setInterval(() => {
        
        setTime(prev => {
            if(prev) clearInterval(timer)
            return prev - 1
        })
    },wait)

        return () => clearInterval(timer)
    },[initialTime,wait])
        
    return(
        <>
        倒计时：{time}
        </>
    )
}

export default CountDown