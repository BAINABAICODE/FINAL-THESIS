import bronzeFallow from './bronze-fallow.webp'
import bronzeFallow2x from './bronze-fallow-2x.webp'
import cinnamon from './cinnamon.webp'
import cinnamon2x from './cinnamon-2x.webp'
import dilute from './dilute.webp'
import dmJade from './dm-jade.webp'
import dmJade2x from './dm-jade-2x.webp'
import dominantPied from './dominant-pied.webp'
import dominantPied2x from './dominant-pied-2x.webp'
import doubleViolet from './double-violet.webp'
import doubleViolet2x from './double-violet-2x.webp'
import greyFactor from './grey-factor.webp'
import greyFactor2x from './grey-factor-2x.webp'
import greyFactorDf from './grey-factor-df.webp'
import greyFactorDf2x from './grey-factor-df-2x.webp'
import marbled from './marbled.webp'
import marbled2x from './marbled-2x.webp'
import opaline from './opaline.webp'
import opaline2x from './opaline-2x.webp'
import orangeFace from './orange-face.webp'
import orangeFace2x from './orange-face-2x.webp'
import pale from './pale.webp'
import pale2x from './pale-2x.webp'
import paleFallow from './pale-fallow.webp'
import paleFallow2x from './pale-fallow-2x.webp'
import paleHeaded from './pale-headed.webp'
import paleHeaded2x from './pale-headed-2x.webp'
import paleHeadedDf from './pale-headed-df.webp'
import paleHeadedDf2x from './pale-headed-df-2x.webp'
import recessivePied from './recessive-pied.webp'
import recessivePied2x from './recessive-pied-2x.webp'
import slIno from './sl-ino.webp'
import slIno2x from './sl-ino-2x.webp'
import violet from './violet.webp'
import violet2x from './violet-2x.webp'
import wildType from './wild-type.webp'
import wildType2x from './wild-type-2x.webp'

function photo(label, image, image2x = null, width = 480, width2x = null) {
  const alt = label === 'Wild Type'
    ? 'Rosy-faced lovebird wild type: green body and peach face, with no visual mutation'
    : `Rosy-faced lovebird showing the ${label} visual mutation`
  return { label, image, image2x, width, width2x, alt }
}

/** Keys are the calculator's mutation names in lowercase kebab-case. */
export const MUTATION_IMAGES = {
  'bronze-fallow': photo('Bronze Fallow', bronzeFallow, bronzeFallow2x, 480, 899),
  cinnamon: photo('Cinnamon', cinnamon, cinnamon2x, 480, 894),
  dilute: photo('Dilute', dilute, null, 467),
  'dm-jade': photo('DM Jade', dmJade, dmJade2x, 480, 797),
  'dominant-pied': photo('Dominant Pied', dominantPied, dominantPied2x, 480, 654),
  'double-violet': photo('Double Violet', doubleViolet, doubleViolet2x, 480, 852),
  'grey-factor': photo('Grey Factor', greyFactor, greyFactor2x, 480, 724),
  'grey-factor-df': photo('Grey Factor DF', greyFactorDf, greyFactorDf2x, 480, 792),
  marbled: photo('Marbled', marbled, marbled2x, 480, 563),
  opaline: photo('Opaline', opaline, opaline2x, 480, 780),
  'orange-face': photo('Orange Face', orangeFace, orangeFace2x, 480, 611),
  pale: photo('Pale', pale, pale2x, 480, 729),
  'pale-fallow': photo('Pale Fallow', paleFallow, paleFallow2x, 480, 755),
  'pale-headed': photo('Pale Headed', paleHeaded, paleHeaded2x, 480, 960),
  'pale-headed-df': photo('Pale Headed DF', paleHeadedDf, paleHeadedDf2x, 480, 690),
  'recessive-pied': photo('Recessive Pied', recessivePied, recessivePied2x, 480, 736),
  'sl-ino': photo('SL Ino', slIno, slIno2x, 480, 634),
  violet: photo('Violet', violet, violet2x, 480, 779),
  'wild-type': photo('Wild Type', wildType, wildType2x, 480, 502),
}

export const WILD_TYPE_KEY = 'wild-type'

/** Peach-faced catalog mutations that have no reference photo yet. */
export const MUTATIONS_WITHOUT_IMAGES = ['pallid']

/** Source files that did not match a calculator mutation name. */
export const UNMATCHED_MUTATION_IMAGES = []
