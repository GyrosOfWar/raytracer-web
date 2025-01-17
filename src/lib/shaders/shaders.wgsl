const OBJECT_COUNT: u32 = 2;
const FLT_MAX: f32 = 3.40282346638528859812e+38;
const MAX_PATH_LENGTH: u32 = 6u;
const EPSILON: f32 = 1e-3;

struct Uniforms {
    width: u32,
    height: u32,
    frame_count: u32,
    camera_z: u32,
}

struct Ray {
    origin: vec3f,
    direction: vec3f,
}

fn point_on_ray(ray: Ray, t: f32) -> vec3<f32> {
    return ray.origin + t * ray.direction;
}

struct Scatter {
  attenuation: vec3f,
  ray: Ray,
}

fn random_range(min: f32, max: f32) -> f32 {
    return min + (max - min) * rand_f32();
}

fn random_vec_range(min: f32, max: f32) -> vec3f {
    return vec3f(
        random_range(min, max),
        random_range(min, max),
        random_range(min, max)
    );
}


fn random_unit_sphere() -> vec3f {
    var num_attempts = 0;
    while num_attempts < 50 {
        let p = random_vec_range(-1.0, 1.0);
        if dot(p, p) < 1.0 {
            return p;
        }
        num_attempts += 1;
    }

    return vec3f(0., 1., 0.);
}

fn random_unit_vector() -> vec3f {
    return normalize(random_unit_sphere());
}

fn random_on_hemisphere(normal: vec3f) -> vec3f {
    let p = random_unit_sphere();

    return select(p, -p, dot(p, normal) > 0.0);
}

fn scatter(input_ray: Ray, hit: Intersection, color: vec3f) -> Scatter {
    let hit_point = point_on_ray(input_ray, hit.t);
    let direction = hit.normal + random_unit_vector();

    let output_ray = Ray(hit_point, direction);
    let attenuation = color;
    return Scatter(attenuation, output_ray);
}

struct Sphere {
    center: vec3f,
    radius: f32,
    color: vec3f,
}

struct Intersection {
    normal: vec3f,
    t: f32,
    color: vec3f,
}

fn no_intersection() -> Intersection {
    return Intersection(vec3(0.), -1., vec3(0.));
}

fn is_intersection_valid(hit: Intersection) -> bool {
    return hit.t > 0.;
}

fn intersect_scene(ray: Ray) -> Intersection {
    var closest_hit = Intersection(vec3(0.), FLT_MAX, vec3(0.));
    for (var i = 0u; i < OBJECT_COUNT; i += 1u) {
        let sphere = scene[i];
        let hit = intersect_sphere(ray, sphere);
        if hit.t > 0. && hit.t < closest_hit.t {
            closest_hit = hit;
        }
    }
    if closest_hit.t < FLT_MAX {
        return closest_hit;
    }
    return no_intersection();
}

@group(0) 
@binding(0)
var<uniform> uniforms: Uniforms;

@group(0) 
@binding(1) 
var radiance_samples_old: texture_2d<f32>;

@group(0)
@binding(2)
var radiance_samples_new: texture_storage_2d<rgba32float, write>;

struct Rng {
  state: u32,
};
var<private> rng: Rng;

fn init_rng(pixel: vec2u) {
  // Seed the PRNG using the scalar index of the pixel and the current frame count.
    let seed = (pixel.x + pixel.y * uniforms.width) ^ jenkins_hash(uniforms.frame_count);
    rng.state = jenkins_hash(seed);
}

// A slightly modified version of the "One-at-a-Time Hash" function by Bob Jenkins.
// See https://www.burtleburtle.net/bob/hash/doobs.html
fn jenkins_hash(i: u32) -> u32 {
    var x = i;
    x += x << 10u;
    x ^= x >> 6u;
    x += x << 3u;
    x ^= x >> 11u;
    x += x << 15u;
    return x;
}

// The 32-bit "xor" function from Marsaglia G., "Xorshift RNGs", Section 3.
fn xorshift32() -> u32 {
    var x = rng.state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    rng.state = x;
    return x;
}

// Returns a random float in the range [0...1]. This sets the floating point exponent to zero and
// sets the most significant 23 bits of a random 32-bit unsigned integer as the mantissa. That
// generates a number in the range [1, 1.9999999], which is then mapped to [0, 0.9999999] by
// subtraction. See Ray Tracing Gems II, Section 14.3.4.
fn rand_f32() -> f32 {
    return bitcast<f32>(0x3f800000u | (xorshift32() >> 9u)) - 1.;
}

alias TriangleVertices = array<vec2f, 6>;

var<private> vertices: TriangleVertices = TriangleVertices(
    vec2f(-1.0, 1.0),
    vec2f(-1.0, -1.0),
    vec2f(1.0, 1.0),
    vec2f(1.0, 1.0),
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
);

@vertex
fn display_vs(@builtin(vertex_index) vid: u32) -> @builtin(position) vec4f {
    return vec4f(vertices[vid], 0.0, 1.0);
}

fn sky_color(ray: Ray) -> vec3f {
    // let t = 0.5 * (normalize(ray.direction).y + 1.);
    // return (1. - t) * vec3(1.) + t * vec3(0.3, 0.5, 1.);
    return vec3(0.8);
}

alias Scene = array<Sphere, OBJECT_COUNT>;
var<private> scene: Scene = Scene(
    Sphere(vec3(0., 0., -1.), 0.5, vec3f(1.0, 0.1, 0.1)),
    Sphere(vec3(0., -100.5, -1.), 100., vec3f(0.7, 0.7, 0.7)),
);

fn intersect_sphere(ray: Ray, sphere: Sphere) -> Intersection {
    let v = ray.origin - sphere.center;
    let a = dot(ray.direction, ray.direction);
    let b = dot(v, ray.direction);
    let c = dot(v, v) - sphere.radius * sphere.radius;

    let d = b * b - a * c;
    if d < 0. {
        return no_intersection();
    }

    let sqrt_d = sqrt(d);
    let recip_a = 1. / a;
    let mb = -b;
    let t1 = (mb - sqrt_d) * recip_a;
    let t2 = (mb + sqrt_d) * recip_a;
    let t = select(t2, t1, t1 > EPSILON);
    if t <= EPSILON {
        return no_intersection();
    }

    let p = point_on_ray(ray, t);
    let N = (p - sphere.center) / sphere.radius;
    return Intersection(N, t, sphere.color);
}

@fragment 
fn display_fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    init_rng(vec2u(pos.xy));

    let origin = vec3(0.0);
    let focus_distance = f32(uniforms.camera_z);
    let aspect_ratio = f32(uniforms.width) / f32(uniforms.height);

    let offset = vec2(rand_f32() - 0.5, rand_f32() - 0.5);
    var uv = (pos.xy + offset) / vec2f(f32(uniforms.width - 1u), f32(uniforms.height - 1u));

    // Map `uv` from y-down (normalized) viewport coordinates to camera coordinates.
    uv = (2. * uv - vec2(1.)) * vec2(aspect_ratio, -1.);

    let direction = vec3(uv, -focus_distance);
    var ray = Ray(origin, direction);
    var throughput = vec3f(1.);
    var radiance_sample = vec3(0.);

    var path_length = 0u;
    while path_length < MAX_PATH_LENGTH {
        let hit = intersect_scene(ray);
        if is_intersection_valid(hit) {
            let scattered = scatter(ray, hit, hit.color);
            throughput *= scattered.attenuation;
            ray = scattered.ray;
        } else {
            // If no intersection was found, return the color of the sky and terminate the path.
            radiance_sample += throughput * sky_color(ray);
      break;
        }
        path_length += 1u;
    }

    // Fetch the old sum of samples.
    var old_sum: vec3f;
    if uniforms.frame_count > 1 {
        old_sum = textureLoad(radiance_samples_old, vec2u(pos.xy), 0).xyz;
    } else {
        old_sum = vec3(0.);
    }

    // Compute and store the new sum.
    let new_sum = radiance_sample + old_sum;
    textureStore(radiance_samples_new, vec2u(pos.xy), vec4(new_sum, 0.));

    // Display the average.
    return vec4(new_sum / f32(uniforms.frame_count), 1.);
}
