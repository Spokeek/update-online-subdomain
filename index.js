const rp = require('request-promise')
const uuidV1 = require('uuid/v1');
const IPECHO_URL = 'http://ipecho.net/plain'

const ENV_VARIABLES_MANDATORY = ['TOKEN', 'DOMAIN_NAME']

ENV_VARIABLES_MANDATORY.forEach(key => {
    if (!process.env[key]) {
        console.log(`the environement variable ${key} is not defined.`)
        console.log("Exiting application")
        process.exit(1)
    }
})

const API_ENDPOINT = process.env.API_ENDPOINT || 'https://api.online.net/api'
const API_VERSION = process.env.API_VERSION || 'v1'
const SUBDOMAIN_DEFAULT_PRIORITY = process.env.SUBDOMAIN_DEFAULT_PRIORITY || 12
const ZONE_PREFIX = process.env.ZONE_PREFIX || "autoZone_"
const TOKEN = process.env.TOKEN
const DOMAIN_NAME = process.env.DOMAIN_NAME
const SUBDOMAIN = process.env.SUBDOMAIN || 'home'

const getOptions = (url, options) => ({
    uri: `${API_ENDPOINT}/${API_VERSION}/${url}`,
    headers: {
        'Authorization': `Bearer ${TOKEN}`
    },
    json: true,
    ...options
})

rp(getOptions(`domain`))
.then(domains => domains.find(d => d.name === DOMAIN_NAME).id)
.then(domain_id => rp(getOptions(`domain/${domain_id}/version`))
    .then(versions => {
        const active_version_uuid = versions.find(v => v.active).uuid_ref
        return Promise.all([
            rp(getOptions(`domain/${domain_id}/version/${active_version_uuid}/zone`)),
            rp(IPECHO_URL)
        ])
    })
    .then(values => {
        const [subdomains, external_ip] = values
        return subdomains.map(s => s.name === SUBDOMAIN ? { ...s, data: external_ip } : s)
    })
    .then(updatedZone => {
        return updatedZone
    })
    .then(updatedZone => {
        const name = `${ZONE_PREFIX}${uuidV1()}`
        return rp(getOptions(`domain/${domain_id}/version`, { method: 'POST', body: { name } }))
            .then(() => rp(getOptions(`domain/${domain_id}/version`)))
            .then(versions => versions.find(v => v.name === name).uuid_ref)
            .then(version_id => Promise.all(updatedZone.map(subdomain => {
                const data = { method: 'POST', body: { priority: SUBDOMAIN_DEFAULT_PRIORITY, ...subdomain } }
                rp(getOptions(`domain/${domain_id}/version/${version_id}/zone`, data))
            })))
    })
)
.catch(e => console.error(e.message))