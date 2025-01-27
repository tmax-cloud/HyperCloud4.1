//input 'Is it OK? \n MAJOR_VERSION=4, MINOR_VERSION=1, PATCH_VERSION=${env.BUILD_NUMBER}, HOTFIX_VERSION=3'
// Script Pipeline 
// def CHOICE = input message: 'choice your cloud', 
  // parameters: [choice(choices: ['kubernetes','196'],
  // description: 'need to specify where deploy console app', name: 'Cloud option')]
// def CHOICE = "kubernetes"
// def MAJOR_VERSION = "4"
// def MINOR_VERSION = "1"
def CHOICE = "${params.choice}"
def MAJOR_VERSION = "${params.major_version}"
def MINOR_VERSION = "${params.minor_version}"
def PATCH_VERSION = "${params.patch_version}"
def PRE_VERSION = (("${params.patch_version}" as int) - 1).toString()
def HOTFIX_VERSION = "${params.hotfix_version}"
def DOCKER_REGISTRY = "tmaxcloudck"
def PRODUCT = "hypercloud-console"
def VER = "${MAJOR_VERSION}.${MINOR_VERSION}.${PATCH_VERSION}.${HOTFIX_VERSION}"
def PRE_VER = "${MAJOR_VERSION}.${MINOR_VERSION}.${PRE_VERSION}.${HOTFIX_VERSION}"
// def VER = "1.1.38.1"
def REALM = "${params.realm}"
def KEYCLOAK = "${params.keycloak}"
def CLIENTID = "${params.clientid}"
def BRANCH = "hc-release"
 
// k8s environment 
def NAME_NS = "console-system"
def NODE_PORT = "31304"
def HDC_FLAG = "false"
def PORTAL = "false"

def USER_TOKEN = "jinsoo-access-token"
def USER_NAME = "jinsoo-youn"
def USER_EMAIL = "jinsoo_youn@tmax.co.kr"

podTemplate(cloud: "${CHOICE}", containers: [
//   podTemplate(containers: [
// // podTemplate(cloud: 'kubernetes', containers: [
    containerTemplate(name: 'docker', image: 'docker', command: 'cat', ttyEnabled: true),
    containerTemplate(name: 'kubectl', image: 'lachlanevenson/k8s-kubectl:v1.18.3', command: 'cat', ttyEnabled: true),
    // containerTemplate(name: 'ssh-client', image: 'kroniak/ssh-client', command: 'cat', ttyEnabled: true),
],
volumes: [
  hostPathVolume(mountPath: '/var/run/docker.sock', hostPath: '/var/run/docker.sock')
]) {
  node(POD_LABEL) {
    def myRepo = checkout scm
    def gitBranch = myRepo.GIT_BRANCH 

    stage('Input'){
      sh "echo 'INSTALL TO ${CHOICE}'"
      sh "echo 'PRODUCT=${PRODUCT}'"
      sh "echo 'VERSION=${VER}'"
      sh "echo 'PREVIOUS_VERSION=${PRE_VER}'"
    }

    stage('Docker Build'){
      container('docker'){
        withCredentials([usernamePassword(
          credentialsId: 'tmaxcloudck', 
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PWD')]){
          sh "docker login -u ${DOCKER_USER} -p ${DOCKER_PWD}"
          sh "docker build -t ${DOCKER_REGISTRY}/${PRODUCT}:${MAJOR_VERSION}.${MINOR_VERSION}.${PATCH_VERSION}.${HOTFIX_VERSION} -f ./Dockerfile.jenkins ."
          sh "docker push ${DOCKER_REGISTRY}/${PRODUCT}:${MAJOR_VERSION}.${MINOR_VERSION}.${PATCH_VERSION}.${HOTFIX_VERSION}"
          }
      }
    }
    
    stage('K8S Deploy'){
      container('kubectl'){
        sh "rm -rf ./temp-yaml"     
        sh "cp -r ./install-yaml ./temp-yaml"
        sh "sed -i 's#@@NAME_NS@@#${NAME_NS}#g' ./temp-yaml/*.yaml"
        sh "cat ./temp-yaml/1.initialization.yaml"
        sh "sed -i 's#@@NODE_PORT@@#${NODE_PORT}#g' ./temp-yaml/2.svc-np.yaml"
        sh "cat ./temp-yaml/2.svc-np.yaml"
        
        sh "sed -i 's#@@REALM@@#${REALM}#g' ./temp-yaml/3.deployment.yaml "
        sh "sed -i 's#@@KEYCLOAK@@#${KEYCLOAK}#g' ./temp-yaml/3.deployment.yaml "
        sh "sed -i 's#@@CLIENTID@@#${CLIENTID}#g' ./temp-yaml/3.deployment.yaml "
        sh "sed -i 's#@@VER@@#${VER}#g' ./temp-yaml/3.deployment.yaml "
        sh "sed -i '/--hdc-mode=/d' ./temp-yaml/3.deployment.yaml"
        sh "sed -i '/--tmaxcloud-portal=/d' ./temp-yaml/3.deployment.yaml"
        sh "cat ./temp-yaml/3.deployment.yaml"
        sh "kubectl apply -f ./temp-yaml/1.initialization.yaml"

        secret = sh (
          script: 'kubectl get secret -A | grep console-https-secret',
          returnStdout: true
        ).trim()
        sh """
        if [ -z "${secret}" ]; then
          kubectl create secret tls console-https-secret --cert=tls/tls.crt --key=tls/tls.key -n ${NAME_NS}
        fi
        """
        sh "kubectl apply -f ./temp-yaml/2.svc-lb.yaml"
        sh "kubectl apply -f ./temp-yaml/2.svc-np.yaml"
        sh "kubectl apply -f ./temp-yaml/3.deployment.yaml"
        // sh "kubectl apply -f ./temp-yaml/3.deployment.yaml"
      }
    }

    stage('GIT Commit & Push'){
      withCredentials([string(credentialsId: "${USER_TOKEN}", variable: 'GITHUB_ACCESS_TOKEN')]) {      
        sh """
          git config --global user.name ${USER_NAME}
          git config --global user.email ${USER_EMAIL}        
        """
        sh "git tag ${PRODUCT}_${VER}"
        sh "git push https://${GITHUB_ACCESS_TOKEN}@github.com/tmax-cloud/hypercloud-console4.1.git HEAD:${BRANCH} --tags"    

        // NOTE: 4.1.3.0 정기 배포관련된 패치 노트는 젠킨스 이용 x tag가 꼬여서 직접 만들어서 업로드 함 
        sh """
          echo '# hypercloud-console patch note' > ./docs-internal/CHANGELOG.md
          echo '## [Product Name]_[major].[minor].[patch].[hotfix]' >> ./docs-internal/CHANGELOG.md
          echo 'Version: ${PRODUCT}_${VER}' >> ./docs-internal/CHANGELOG.md
          date '+%F  %r' >> ./docs-internal/CHANGELOG.md

          git log --grep=[patch] -F --all-match --no-merges --date-order --reverse \
          --pretty=format:\"- %s (%cn) %n    Message: %b\" \
          --simplify-merges ${PRODUCT}_${PRE_VER}..${PRODUCT}_${VER} \
          >> ./docs-internal/CHANGELOG.md
        """

        //// sh "rm -r ./temp-yaml"
        sh "git add -A"
        sh "git commit -m 'build ${PRODUCT}_${VER}' "
        sh "git push https://${GITHUB_ACCESS_TOKEN}@github.com/tmax-cloud/hypercloud-console4.1.git HEAD:${BRANCH}"        

      }
    }


  }
}
