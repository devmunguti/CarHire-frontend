import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { company } from '../../config/company'
import { t } from '../../i18n'
import 'leaflet/dist/leaflet.css'

export function ContactBranchMap() {
  const position: [number, number] = [company.branch.latitude, company.branch.longitude]
  const branchIcon = L.divIcon({
    className: 'contact-map__marker',
    html: '<span aria-hidden="true"></span>',
    iconSize: [28, 36],
    iconAnchor: [14, 34],
  })

  return <div aria-label={t('contact.map.region').replace('{name}', company.name).replace('{address}', company.address)} className="contact-map" role="region">
    <MapContainer center={position} scrollWheelZoom={false} style={{ height: '100%', minHeight: 340, width: '100%' }} zoom={14}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker icon={branchIcon} position={position} title={`${company.name} branch`}>
        <Popup>{company.name}<br />{company.address}</Popup>
      </Marker>
    </MapContainer>
  </div>
}
