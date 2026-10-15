import { useEffect, useState } from 'react'
import { resolveMutationVisual } from './eggCardModel'

export default function EggMutationMedia({
  names,
  species,
  baseColor,
  sizes = '(max-width: 639px) 72px, 96px',
  compact = false,
}) {
  const visual = resolveMutationVisual(names, { species, baseColor })
  const [swapToWild, setSwapToWild] = useState(false)
  const [dead, setDead] = useState(false)

  useEffect(() => {
    setSwapToWild(false)
    setDead(false)
  }, [visual.chip, visual.image, visual.series])

  const photo = swapToWild
    ? {
      key: visual.fallbackKey,
      image: visual.fallbackImage,
      srcSet: visual.fallbackSrcSet,
      alt: `Reference photo failed to load. ${visual.fallbackAlt}`,
    }
    : visual
  const showImage = !dead && photo.image

  const handleError = () => {
    if (swapToWild || photo.key === visual.fallbackKey) {
      setDead(true)
      return
    }
    setSwapToWild(true)
  }

  return (
    <figure className="compute-result__egg-media">
      {showImage ? (
        <img
          src={photo.image}
          srcSet={photo.srcSet || undefined}
          sizes={sizes}
          alt={photo.alt}
          loading="lazy"
          decoding="async"
          width="96"
          height="96"
          onError={handleError}
        />
      ) : (
        <span className="compute-result__egg-media-fallback" role="img" aria-label={visual.fallbackAlt}>
          Wild type
        </span>
      )}
      {compact ? null : <figcaption className="compute-result__egg-chip">{visual.chip}</figcaption>}
      {!compact && visual.extras.length ? (
        <ul className="compute-result__egg-chips" aria-label="Other visual mutations">
          {visual.extras.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      ) : null}
      {!compact && visual.usedFallback ? (
        <p className="compute-result__egg-fallback">No {visual.chip} photo. Wild type is shown instead.</p>
      ) : null}
    </figure>
  )
}
