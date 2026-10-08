import bronzeFallow from './fischers/bronze-fallow.webp'
import bronzeFallow2x from './fischers/bronze-fallow-2x.webp'
import cinnamon from './fischers/cinnamon.webp'
import cinnamon2x from './fischers/cinnamon-2x.webp'
import darkEyedClear from './fischers/dark-eyed-clear.webp'
import darkEyedClear2x from './fischers/dark-eyed-clear-2x.webp'
import dilute from './fischers/dilute.webp'
import dilute2x from './fischers/dilute-2x.webp'
import diluteBlue from './fischers/dilute-blue.webp'
import dominantEdged from './fischers/dominant-edged.webp'
import dominantEdged2x from './fischers/dominant-edged-2x.webp'
import dominantEdgedDf from './fischers/dominant-edged-df.webp'
import dominantEdgedDf2x from './fischers/dominant-edged-df-2x.webp'
import dominantPied from './fischers/dominant-pied.webp'
import dominantPied2x from './fischers/dominant-pied-2x.webp'
import dominantReduced from './fischers/dominant-reduced.webp'
import dominantReduced2x from './fischers/dominant-reduced-2x.webp'
import doubleViolet from './fischers/double-violet.webp'
import dunFallow from './fischers/dun-fallow.webp'
import dunFallow2x from './fischers/dun-fallow-2x.webp'
import euwing from './fischers/euwing.webp'
import euwing2x from './fischers/euwing-2x.webp'
import euwingDfBlue from './fischers/euwing-df-blue.webp'
import euwingDfBlue2x from './fischers/euwing-df-blue-2x.webp'
import euwingDfGreen from './fischers/euwing-df-green.webp'
import euwingDfGreen2x from './fischers/euwing-df-green-2x.webp'
import misty from './fischers/misty.webp'
import misty2x from './fischers/misty-2x.webp'
import mistyDf from './fischers/misty-df.webp'
import mistyDf2x from './fischers/misty-df-2x.webp'
import nslIno from './fischers/nsl-ino.webp'
import nslIno2x from './fischers/nsl-ino-2x.webp'
import opaline from './fischers/opaline.webp'
import opaline2x from './fischers/opaline-2x.webp'
import paleFallowBlue from './fischers/pale-fallow-blue.webp'
import paleFallowBlue2x from './fischers/pale-fallow-blue-2x.webp'
import paleFallowGreen from './fischers/pale-fallow-green.webp'
import paleFallowGreen2x from './fischers/pale-fallow-green-2x.webp'
import pastel from './fischers/pastel.webp'
import pastel2x from './fischers/pastel-2x.webp'
import recessivePiedBlue from './fischers/recessive-pied-blue.webp'
import recessivePiedBlue2x from './fischers/recessive-pied-blue-2x.webp'
import recessivePiedGreen from './fischers/recessive-pied-green.webp'
import recessivePiedGreen2x from './fischers/recessive-pied-green-2x.webp'
import slGreywing from './fischers/sl-greywing.webp'
import slGreywing2x from './fischers/sl-greywing-2x.webp'
import slGreywingDf from './fischers/sl-greywing-df.webp'
import slGreywingDf2x from './fischers/sl-greywing-df-2x.webp'
import slaty from './fischers/slaty.webp'
import slaty2x from './fischers/slaty-2x.webp'
import violet from './fischers/violet.webp'
import violet2x from './fischers/violet-2x.webp'
import wildType from './fischers/wild-type.webp'

function shot(label, image, image2x, width, width2x, series) {
  const ground = series === 'blue'
    ? ' on a blue-series base color'
    : series === 'green'
      ? ' on a green-series base color'
      : ''
  const alt = label === 'Wild Type'
    ? "Fischer's lovebird wild type: green body and orange face, with no visual mutation"
    : `Fischer's lovebird showing the ${label} visual mutation${ground}`
  return { label, image, image2x, width, width2x, alt }
}

function single(label, image, image2x, width, width2x) {
  return { label, default: shot(label, image, image2x, width, width2x) }
}

/** Fischer's photos. `default` is the unlabeled file (green bird). `green` and `blue` follow the filename series. */
export const FISCHER_IMAGES = {
  'bronze-fallow': single('Bronze Fallow', bronzeFallow, bronzeFallow2x, 480, 559),
  cinnamon: single('Cinnamon', cinnamon, cinnamon2x, 480, 590),
  'dark-eyed-clear': single('Dark Eyed Clear', darkEyedClear, darkEyedClear2x, 480, 575),
  dilute: {
    label: 'Dilute',
    default: shot('Dilute', dilute, dilute2x, 480, 535, 'green'),
    blue: shot('Dilute', diluteBlue, null, 434, null, 'blue'),
  },
  'dominant-edged': single('Dominant Edged', dominantEdged, dominantEdged2x, 480, 550),
  'dominant-edged-df': single('Dominant Edged DF', dominantEdgedDf, dominantEdgedDf2x, 480, 906),
  'dominant-pied': single('Dominant Pied', dominantPied, dominantPied2x, 480, 580),
  'dominant-reduced': single('Dominant Reduced', dominantReduced, dominantReduced2x, 480, 636),
  'double-violet': single('Double Violet', doubleViolet, null, 373, null),
  'dun-fallow': single('Dun Fallow', dunFallow, dunFallow2x, 480, 716),
  euwing: single('Euwing', euwing, euwing2x, 480, 675),
  'euwing-df': {
    label: 'Euwing DF',
    green: shot('Euwing DF', euwingDfGreen, euwingDfGreen2x, 480, 625, 'green'),
    blue: shot('Euwing DF', euwingDfBlue, euwingDfBlue2x, 480, 628, 'blue'),
  },
  misty: single('Misty', misty, misty2x, 480, 705),
  'misty-df': single('Misty DF', mistyDf, mistyDf2x, 480, 626),
  'nsl-ino': single('NSL Ino', nslIno, nslIno2x, 480, 726),
  opaline: single('Opaline', opaline, opaline2x, 480, 625),
  'pale-fallow': {
    label: 'Pale Fallow',
    green: shot('Pale Fallow', paleFallowGreen, paleFallowGreen2x, 480, 689, 'green'),
    blue: shot('Pale Fallow', paleFallowBlue, paleFallowBlue2x, 480, 653, 'blue'),
  },
  pastel: single('Pastel', pastel, pastel2x, 480, 590),
  'recessive-pied': {
    label: 'Recessive Pied',
    green: shot('Recessive Pied', recessivePiedGreen, recessivePiedGreen2x, 480, 633, 'green'),
    blue: shot('Recessive Pied', recessivePiedBlue, recessivePiedBlue2x, 480, 539, 'blue'),
  },
  'sl-greywing': single('SL Greywing', slGreywing, slGreywing2x, 480, 673),
  'sl-greywing-df': single('SL Greywing DF', slGreywingDf, slGreywingDf2x, 480, 673),
  slaty: single('Slaty', slaty, slaty2x, 480, 648),
  violet: single('Violet', violet, violet2x, 480, 535),
  'wild-type': single('Wild Type', wildType, null, 376, null),
}

export const FISCHER_WILD_TYPE_KEY = 'wild-type'

/** Fischer's catalog mutations with no reference photo yet. */
export const FISCHER_MUTATIONS_WITHOUT_IMAGES = []

/** Source files that did not match a Fischer's mutation name. */
export const FISCHER_UNMATCHED_MUTATION_IMAGES = []
