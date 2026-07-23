const mySetInterval = (fn,t) =>{
    let timer = null
    function interval() {
        fn()
        timer = setTimeout(interval,t)
    }
    interval()
    return {

        cancel(){
            clearTimeout(timer);
        }

    }
}