const rp = require('request-promise') 
const uuidV1 = require('uuid/v1');
const IPECHO_URL = 'http://ipecho.net/plain'

const API_ENDPOINT = process.env.API_ENDPOINT || 'https://api.online.net/api'
const API_VERSION = process.env.API_VERSION || 'v1'
const TOKEN = process.env.TOKEN
const DOMAIN_NAME = process.env.DOMAIN_
const SUBDOMAIN = process.env.SUBDOMAIN || 'home'

const getOptions = (url, options) => ({
    uri: `${API_ENDPOINT}/${API_VERSION}/${url}`,
    headers: {
        'Authorization': `Bearer ${TOKEN}`
    },
    json: true,
    ...options
})

rp(getOptions(`domain/${DOMAIN_ID}/version`))
.then(versions => {
    const active_version_uuid = versions.find(v => v.active).uuid_ref
    return Promise.all([
        rp(getOptions(`domain/${DOMAIN_ID}/version/${active_version_uuid}/zone`)),
        rp(IPECHO_URL)
    ])
})
.then(values => {
    const [subdomains, external_ip] = values
    return subdomains.map(s => s.name === SUBDOMAIN ? {...s, data: external_ip} : s)
})
.then(updatedZone => {
    updatedZone.forEach(s => console.log(`${s.name} : ${s.data}`))
    return updatedZone
})
.then(updatedZone => {
    const name = `autoZone_${uuidV1()}`
    console.log(name)
    // wrong fonction
    return rp(getOptions(`domain/${DOMAIN_ID}/version`, {method: 'POST', body: {name, data: updatedZone}}))
})
.catch(e => console.error(e.message))