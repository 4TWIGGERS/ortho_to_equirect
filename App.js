import React, {useState, useRef, Fragment} from 'react';
import {View, StyleSheet, Text, Dimensions} from 'react-native';
import {
  Canvas,
  Path,
  Group,
  useValue,
  useLoop,
  Easing,
  useDerivedValue,
  useValueEffect,
  useClockValue,
  useTouchHandler,
  interpolate,
  runTiming,
} from '@shopify/react-native-skia';
import d3 from 'd3';
import {
  geoOrthographicRaw,
  geoEquirectangularRaw,
  geoProjectionMutator,
  geoGraticule10,
  geoPath,
} from 'd3-geo';
import {interpolate as d3Interpolate} from 'd3-interpolate';
import {easeCubic} from 'd3-ease';

const {width, height} = Dimensions.get('window');

const n = 480;
const scale = d3Interpolate(width / 4, (width - 2) / (2 * Math.PI));
const rotate = d3Interpolate([10, -20], [0, 0]);

const sphere = {type: 'Sphere'};
const equator = {
  type: 'LineString',
  coordinates: [
    [-180, 0],
    [-90, 0],
    [0, 0],
    [90, 0],
    [180, 0],
  ],
};

const projection = interpolateProjection(
  geoOrthographicRaw,
  geoEquirectangularRaw,
)
  .scale(scale(0))
  .translate([width / 2, height / 2])
  .rotate(rotate(0))
  .precision(0.1);

const graticule = geoGraticule10();

const path = geoPath(projection);

function interpolateProjection(raw0, raw1) {
  const mutate = geoProjectionMutator(t => (x, y) => {
    const [x0, y0] = raw0(x, y),
      [x1, y1] = raw1(x, y);
    return [x0 + t * (x1 - x0), y0 + t * (y1 - y0)];
  });
  let t = 0;
  return Object.assign(mutate(t), {
    alpha(_) {
      return arguments.length ? mutate((t = +_)) : t;
    },
  });
}

export default function App() {
  const animation = useValue(0);

  const touchStartTime = useRef(0);
  const touchHandler = useTouchHandler({
    onStart: () => {
      touchStartTime.current = Date.now();
    },
    onEnd: () => {
      if (Date.now() - touchStartTime.current < 500) {
        runTiming(animation, animation.current ? 0 : n, {
          duration: 5000,
          easing: Easing.linear,
        });
      }
    },
  });

  useValueEffect(animation, () => {
    const i = animation.current;
    const t = easeCubic(2 * i > n ? 2 - (2 * i) / n : (2 * i) / n);
    projection.alpha(t).rotate(rotate(t)).scale(scale(t));

    graticulePath.value = path(graticule);
    sphere.value = path(sphere);
    equatorPath.value = path(equatorPath);
  });

  const graticulePath = useDerivedValue(() => path(graticule), [animation]);
  const spherePath = useDerivedValue(() => path(sphere), [animation]);
  const equatorPath = useDerivedValue(() => path(equator), [animation]);

  return (
    <Canvas style={styles.root} onTouch={touchHandler}>
      <Group style="stroke">
        <Path color="#aaa" path={graticulePath} />
        <Path color="#000" path={spherePath} />
        <Path strokeWidth={1.5} color="#f00" path={equatorPath} />
      </Group>
    </Canvas>
  );
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
