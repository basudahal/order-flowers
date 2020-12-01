import jenkins.model.*

pipeline {
    agent any
    environment {
        subject = ''
        projectName = 'order-flowers'
        deploymentRole = 'deployment-role'
        deploymentCredentialId = '7583a985-3166-43a1-9340-a2622c4794a9'
        deploymentAccount = '878955458484'
    }
    parameters {
        string(description: 'dev tag', name: 'dev_tag')
        choice(name: 'region', choices: ['us-east-1', 'us-east-2'], description: 'Region to deploy')
        choice(name: 'environment', choices: ['dev'], description: 'Environment to deploy')
    }
    stages {
        stage('Prepare') {
            steps {
                    //buildName "${params.dev_tag}-${params.environment}"
                    //BUILD_DISPLAY_NAME "${params.dev_tag}-${params.environment}-${params.region}"
                    sh "git checkout ${params.dev_tag}"
                    sh "zip order-flowers.zip -r OrderFlowers_Export.json"
                    script {
                      deployLambda = "serverless deploy"
                      deployLex = "aws start-import --payload order-flowers.zip --resource-type BOT --merge-strategy OVERWRITE_LATEST"
                      deployAccount = deploymentAccount
                    }
            }
        }
        stage('Run NPM install') {
          steps {
            sh "npm install"
          }
        }
        stage('Deploy') {
            steps {
                script {
                    withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: '7583a985-3166-43a1-9340-a2622c4794a9']]) {
                        sh deployLambda
                        sh deployLex
                    }
                }
            }
        }
    }
    post {
        always {
            deleteDir()
            cleanWs()
            echo 'Done'
        }
    }
}
