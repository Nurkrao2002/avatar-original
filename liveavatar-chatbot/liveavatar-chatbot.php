<?php
/**
 * Plugin Name: LiveAvatar Chatbot
 * Description: Floating LiveAvatar AI assistant for your website.
 * Version: 1.0.3
 * Author: Your Name
 */

if (!defined('ABSPATH')) exit;

class LiveAvatar_Chatbot_Plugin {

    public function __construct() {
        add_action('admin_menu', array($this, 'add_settings_page'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('wp_ajax_liveavatar_create_session', array($this, 'ajax_create_session'));
        add_action('wp_ajax_nopriv_liveavatar_create_session', array($this, 'ajax_create_session'));
        add_action('wp_ajax_liveavatar_send_text', array($this, 'ajax_send_text'));
        add_action('wp_ajax_nopriv_liveavatar_send_text', array($this, 'ajax_send_text'));
    }

    public function add_settings_page() {
        add_options_page(
            'LiveAvatar Chatbot',
            'LiveAvatar Chatbot',
            'manage_options',
            'liveavatar-chatbot',
            array($this, 'render_settings_page')
        );
    }

    public function register_settings() {
        register_setting('liveavatar_chatbot_group', 'liveavatar_api_key');
        register_setting('liveavatar_chatbot_group', 'liveavatar_avatar_id');
        // voice removed
        register_setting('liveavatar_chatbot_group', 'liveavatar_context_id');
    }

    public function render_settings_page() {
?>
        <div class="wrap">
            <h1>LiveAvatar Chatbot Settings</h1>

            <form method="post" action="options.php">
                <?php settings_fields('liveavatar_chatbot_group'); ?>
                <?php do_settings_sections('liveavatar_chatbot_group'); ?>

                <table class="form-table">
                    <tr>
                        <th>LiveAvatar API Key</th>
                        <td>
                            <input type="text"
                                   name="liveavatar_api_key"
                                   value="<?php echo esc_attr(get_option('liveavatar_api_key')); ?>"
                                   size="60">
                        </td>
                    </tr>

                    <tr>
                        <th>Avatar ID</th>
                        <td>
                            <input type="text"
                                   name="liveavatar_avatar_id"
                                   value="<?php echo esc_attr(get_option('liveavatar_avatar_id')); ?>"
                                   size="60">
                        </td>
                    </tr>

                    <tr>
                        <th>Context ID</th>
                        <td>
                            <input type="text"
                                   name="liveavatar_context_id"
                                   value="<?php echo esc_attr(get_option('liveavatar_context_id')); ?>"
                                   size="60">
                        </td>
                    </tr>
                </table>

                <?php submit_button(); ?>
            </form>
        </div>
<?php
    }

    public function enqueue_scripts() {
        wp_enqueue_script(
            'liveavatar-chatbot-widget',
            plugin_dir_url(__FILE__) . 'assets/js/liveavatar-widget.js',
            array('jquery'),
            '1.0.3',
            true
        );

        wp_localize_script(
            'liveavatar-chatbot-widget',
            'LiveAvatarWP',
            array(
                'ajaxUrl' => admin_url('admin-ajax.php'),
            )
        );
    }

    public function ajax_create_session() {

        $api_key    = trim(get_option('liveavatar_api_key'));
        $avatar_id  = trim(get_option('liveavatar_avatar_id'));
        $context_id = trim(get_option('liveavatar_context_id'));

        if (!$api_key || !$avatar_id || !$context_id) {
            wp_send_json_error(array('message' => 'LiveAvatar settings are not configured.'), 400);
        }

        // 1) Create session token — NEW API FORMAT
        $token_payload = array(
            'mode' => 'FULL',
            'avatar_id' => $avatar_id,
            'avatar_persona' => array(
                // voice_id removed – LiveAvatar will use default
                'context_id' => $context_id,
                'language'   => 'en'
            )
        );

        $token_response = wp_remote_post('https://api.liveavatar.com/v1/sessions/token', array(
            'headers' => array(
                'X-API-KEY'    => $api_key,
                'accept'       => 'application/json',
                'content-type' => 'application/json'
            ),
            'body'    => json_encode($token_payload),
            'timeout' => 30
        ));

        $body_raw = wp_remote_retrieve_body($token_response);
        $body = json_decode($body_raw, true);

        error_log("🔍 TOKEN RESPONSE: " . $body_raw);

        if (!isset($body['data']['session_token'])) {
            wp_send_json_error(array(
                'message'  => 'Session token not found.',
                'response' => $body
            ), 500);
        }

        $session_token = $body['data']['session_token'];

        // 2) Start Session — NEW API
        $start_response = wp_remote_post('https://api.liveavatar.com/v1/sessions/start', array(
            'headers' => array(
                'accept'        => 'application/json',
                'authorization' => 'Bearer ' . $session_token
            ),
            'timeout' => 30
        ));

        $start_raw = wp_remote_retrieve_body($start_response);
        $start = json_decode($start_raw, true);

        error_log("🔍 START RESPONSE: " . $start_raw);

        if (!isset($start['data']['livekit_url']) || !isset($start['data']['livekit_client_token'])) {
            wp_send_json_error(array(
                'message'  => 'LiveKit details missing.',
                'response' => $start
            ), 500);
        }

        wp_send_json_success(array(
            'livekit_url'   => $start['data']['livekit_url'],
            'livekit_token' => $start['data']['livekit_client_token'],
            'session_id'    => $start['data']['session_id'] ?? $session_token // Fallback to token if ID not explicit
        ));
    }

    public function ajax_send_text() {
        $api_key = trim(get_option('liveavatar_api_key'));
        $message = isset($_POST['message']) ? sanitize_text_field($_POST['message']) : '';
        $session_id = isset($_POST['session_id']) ? sanitize_text_field($_POST['session_id']) : '';

        if (!$api_key) {
            wp_send_json_error(array('message' => 'API Key missing'), 401);
        }
        if (!$message) {
            wp_send_json_error(array('message' => 'Message is empty'), 400);
        }
        // Note: Some APIs might require session_id. If the JS doesn't have it yet, 
        // we might need to rely on the token or just pass what we have.
        // For now, we'll assume the endpoint is /v1/sessions/chat and it might need a session_id or just the token.
        // If the user is using the HeyGen API directly, the endpoint might be different.
        // Using the assumed endpoint from the plan.

        $payload = array(
            'session_id' => $session_id,
            'text' => $message,
            'task_type' => 'talk'
        );

        // Using the streaming.task endpoint as requested
        $response = wp_remote_post('https://api.liveavatar.com/v1/streaming.task', array(
            'headers' => array(
                'X-API-KEY'    => $api_key, // Keeping X-API-KEY as per other endpoints, assuming consistent auth
                'accept'       => 'application/json',
                'content-type' => 'application/json'
            ),
            'body'    => json_encode($payload),
            'timeout' => 30
        ));

        if (is_wp_error($response)) {
            wp_send_json_error(array('message' => $response->get_error_message()), 500);
        }

        $body_raw = wp_remote_retrieve_body($response);
        $body = json_decode($body_raw, true);

        if (isset($body['error'])) {
             wp_send_json_error($body, 400);
        }

        wp_send_json_success($body);
    }
}

new LiveAvatar_Chatbot_Plugin();
