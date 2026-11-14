import { lazy, Suspense, type ComponentProps } from 'react'
import type { GeoMap as GeoMapComponent } from './GeoMap'

const GeoMap = lazy(() => import('./GeoMap').then((module) => ({ default: module.GeoMap })))

export function LazyGeoMap(props: ComponentProps<typeof GeoMapComponent>) {
  return <Suspense fallback={<div aria-label="Loading map" className={`geo-map ${props.className ?? ''}`} role="status" />}>
    <GeoMap {...props} />
  </Suspense>
}
