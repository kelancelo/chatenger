export function getCookie(key) {
    const cookies = document.cookie.split('; ').map(cookie => {
        return cookie.split('=')
    })
    console.log(cookies)
    for (const cookie of cookies) {
        if (key === cookie[0]) {
            return cookie[1]
        }
    }
    return null
}